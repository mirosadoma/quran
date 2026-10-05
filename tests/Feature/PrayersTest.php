<?php

namespace Tests\Feature;

use App\Enums\PrayerReminderType;
use App\Models\PrayerReminder;
use App\Models\User;
use App\Notifications\PrayerReminderNotification;
use App\Services\PrayerReminders;
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

    public function test_the_prayer_page_shows_the_reminders_with_their_default_times(): void
    {
        $this->actingAs($this->student)
            ->get(route('prayers.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('prayers/index')
                ->where('slug', null)
                ->where('reminders.qiyam', ['is_active' => false, 'time' => '03:30'])
                ->where('reminders.duha', ['is_active' => false, 'time' => '09:00']));
    }

    public function test_a_prayer_of_the_guide_opens_by_its_name(): void
    {
        $this->actingAs($this->student)
            ->get(route('prayers.show', 'qiyam'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->where('slug', 'qiyam'));

        $this->actingAs($this->student)->get(route('prayers.show', 'unknown'))->assertNotFound();
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
