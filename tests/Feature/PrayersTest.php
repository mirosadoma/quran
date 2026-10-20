<?php

namespace Tests\Feature;

use App\Enums\PrayerReminderType;
use App\Models\PrayerGuide;
use App\Models\PrayerReminder;
use App\Models\User;
use App\Notifications\PrayerReminderNotification;
use App\Services\PrayerReminders;
use Database\Seeders\PrayerGuideSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class PrayersTest extends TestCase
{
    use RefreshDatabase;

    protected User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->student()->create(['timezone' => 'Africa/Cairo']);
    }

    public function test_the_prayer_page_shows_the_reminders_with_their_default_times_and_the_prayers_of_the_guide(): void
    {
        PrayerGuide::factory()->create(['slug' => 'duha', 'sort_order' => 2, 'title' => 'صلاة الضحى', 'reminder' => 'duha']);
        PrayerGuide::factory()->create(['slug' => 'qiyam', 'sort_order' => 1, 'title' => 'قيام الليل', 'title_en' => 'Night prayer']);

        $this->actingAs($this->student)
            ->get(route('prayers.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('prayers/index')
                ->where('slug', null)
                ->where('guide', null)
                ->has('guides', 2)
                ->where('guides.0.slug', 'qiyam')
                ->where('guides.0.title', ['ar' => 'قيام الليل', 'en' => 'Night prayer'])
                ->where('guides.0.reminder', null)
                ->where('guides.1.slug', 'duha')
                ->where('guides.1.reminder', 'duha')
                ->missing('guides.0.steps')
                ->where('reminders.qiyam', ['is_active' => false, 'time' => '03:30'])
                ->where('reminders.duha', ['is_active' => false, 'time' => '09:00']));
    }

    public function test_a_prayer_of_the_guide_opens_by_its_name(): void
    {
        PrayerGuide::factory()->create(['slug' => 'qiyam', 'steps' => [['ar' => 'توضأ.', 'en' => 'Make wudu.']]]);

        $this->actingAs($this->student)
            ->get(route('prayers.show', 'qiyam'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('slug', 'qiyam')
                ->where('guide.slug', 'qiyam')
                ->where('guide.steps', [['ar' => 'توضأ.', 'en' => 'Make wudu.']])
                ->has('guide.facts', 1)
                ->has('guide.virtues', 1)
                ->where('guide.duas', []));

        $this->actingAs($this->student)->get(route('prayers.show', 'unknown'))->assertNotFound();
    }

    public function test_the_seeder_installs_the_prayers_of_the_guide_in_their_order(): void
    {
        (new PrayerGuideSeeder)->run();
        // Running it again changes nothing.
        (new PrayerGuideSeeder)->run();

        $guides = PrayerGuide::query()->ordered()->get();
        $this->assertSame(12, $guides->count());
        $this->assertSame('qiyam', $guides->first()->slug);
        $this->assertSame(1, $guides->first()->sort_order);
        $this->assertSame('qiyam', $guides->first()->reminder);
        $this->assertSame('duha', $guides->firstWhere('slug', 'duha')->reminder);
        $this->assertNotEmpty($guides->first()->steps);
        $this->assertNotEmpty($guides->first()->facts[0]['label']['ar']);
        $this->assertNotEmpty($guides->first()->virtues[0]['source']);
    }

    public function test_a_user_turns_on_a_daily_reminder_and_changes_its_time(): void
    {
        $this->actingAs($this->student)
            ->put(route('prayers.reminders.update', 'qiyam'), ['is_active' => true, 'time' => '04:10'])
            ->assertRedirect();

        $reminder = $this->student->prayerReminders()->sole();
        $this->assertTrue($reminder->is_active);
        $this->assertSame('04:10', $reminder->time());

        $reminder->forceFill(['last_sent_on' => '2026-10-05'])->save();

        // A new time may remind again the same day; turning it off keeps the time.
        $this->actingAs($this->student)->put(route('prayers.reminders.update', 'qiyam'), ['is_active' => true, 'time' => '04:40']);
        $this->assertNull($reminder->fresh()->last_sent_on);

        $this->actingAs($this->student)->put(route('prayers.reminders.update', 'qiyam'), ['is_active' => false, 'time' => '04:40']);
        $this->assertFalse($reminder->fresh()->is_active);
        $this->assertSame(1, PrayerReminder::query()->count());

        $this->actingAs($this->student)->put(route('prayers.reminders.update', 'qiyam'), ['is_active' => true, 'time' => '25:00'])->assertSessionHasErrors('time');
        $this->actingAs($this->student)->put(route('prayers.reminders.update', 'tahajjud'), ['is_active' => true, 'time' => '04:00'])->assertNotFound();
    }

    public function test_reminders_are_sent_once_a_day_at_the_time_of_the_users_timezone(): void
    {
        Notification::fake();
        PrayerReminder::factory()->for($this->student)->create(['remind_at' => '03:30']);
        $service = app(PrayerReminders::class);

        // 03:29 in Cairo (UTC+3 in October 2026): not yet.
        $this->assertSame(0, $service->sendDue(Carbon::parse('2026-10-06 00:29', 'UTC')));

        $this->assertSame(1, $service->sendDue(Carbon::parse('2026-10-06 00:31', 'UTC')));
        $this->assertSame(0, $service->sendDue(Carbon::parse('2026-10-06 00:35', 'UTC')));

        Notification::assertSentToTimes($this->student, PrayerReminderNotification::class, 1);
        Notification::assertSentTo($this->student, PrayerReminderNotification::class, fn (PrayerReminderNotification $notification): bool => $notification->prayer === PrayerReminderType::Qiyam);
        $this->assertSame('2026-10-06', PrayerReminder::query()->sole()->last_sent_on->toDateString());

        // The next day it is sent again.
        $this->assertSame(1, $service->sendDue(Carbon::parse('2026-10-07 00:30', 'UTC')));
    }

    public function test_reminders_long_past_their_time_off_or_of_inactive_users_are_not_sent(): void
    {
        Notification::fake();
        PrayerReminder::factory()->for($this->student)->duha()->create();
        PrayerReminder::factory()->off()->create(['remind_at' => '09:00']);
        PrayerReminder::factory()->for(User::factory()->student()->inactive()->create(['timezone' => 'Africa/Cairo']))->duha()->create();

        // 09:45 in Cairo: more than half an hour late.
        $this->assertSame(0, app(PrayerReminders::class)->sendDue(Carbon::parse('2026-10-06 06:45', 'UTC')));

        Notification::assertNothingSent();
    }

    public function test_the_reminder_opens_its_prayer_and_is_not_emailed(): void
    {
        $notification = new PrayerReminderNotification(PrayerReminderType::Duha);

        $this->assertSame(route('prayers.show', 'duha'), $notification->url());
        $this->assertNotContains('mail', $notification->via($this->student));
        $this->assertNotEmpty($notification->body($this->student));
    }

    public function test_the_command_sends_the_due_reminders(): void
    {
        Notification::fake();
        $this->travelTo(Carbon::parse('2026-10-06 00:30', 'UTC'));
        PrayerReminder::factory()->for($this->student)->create(['remind_at' => '03:30']);

        $this->artisan('prayers:remind')->assertSuccessful();

        Notification::assertSentTo($this->student, PrayerReminderNotification::class);
    }
}
