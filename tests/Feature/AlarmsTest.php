<?php

namespace Tests\Feature;

use App\Models\Alarm;
use App\Models\User;
use App\Notifications\AlarmNotification;
use App\Services\Alarms;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AlarmsTest extends TestCase
{
    use RefreshDatabase;

    protected User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->student()->create(['timezone' => 'Africa/Cairo']);
    }

    public function test_a_user_creates_edits_and_deletes_their_alarms(): void
    {
        $this->actingAs($this->student)
            ->post(route('alarms.store'), ['kind' => 'memorization', 'title' => 'ورد الحفظ', 'time' => '06:30', 'days' => [0, 1, 2, 3, 4, 5, 6]])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $alarm = $this->student->alarms()->sole();
        $this->assertSame('06:30', $alarm->time());
        // Every weekday chosen means every day.
        $this->assertNull($alarm->days);
        $this->assertTrue($alarm->is_active);

        $this->actingAs($this->student)
            ->put(route('alarms.update', $alarm), ['kind' => 'prayer', 'title' => 'قيام الليل', 'time' => '03:30', 'days' => [5, 6], 'is_active' => false])
            ->assertSessionHasNoErrors();

        $alarm->refresh();
        $this->assertSame('03:30', $alarm->time());
        $this->assertSame([5, 6], $alarm->days);
        $this->assertFalse($alarm->is_active);

        $this->actingAs($this->student)->post(route('alarms.store'), ['kind' => 'nap', 'title' => '', 'time' => '25:00'])->assertSessionHasErrors(['kind', 'title', 'time']);

        $other = User::factory()->student()->create();
        $this->actingAs($other)->delete(route('alarms.destroy', $alarm))->assertForbidden();
        $this->actingAs($other)->put(route('alarms.update', $alarm), ['kind' => 'custom', 'title' => 'x', 'time' => '10:00'])->assertForbidden();

        $this->actingAs($this->student)->delete(route('alarms.destroy', $alarm))->assertRedirect();
        $this->assertSame(0, Alarm::query()->count());
    }

    public function test_alarms_ring_at_their_time_on_their_days_in_the_users_timezone(): void
    {
        Notification::fake();
        $service = app(Alarms::class);
        // 2026-10-06 is a Tuesday (2).
        Alarm::factory()->for($this->student)->create(['ring_at' => '06:00']);
        Alarm::factory()->for($this->student)->onDays([5])->create(['ring_at' => '06:00', 'title' => 'الجمعة فقط']);
        Alarm::factory()->for($this->student)->off()->create(['ring_at' => '06:00']);

        // 05:59 in Cairo (UTC+3): not yet.
        $this->assertSame(0, $service->ringDue(Carbon::parse('2026-10-06 02:59', 'UTC')));
        // 06:01: the daily alarm rings; the Friday one and the one that is off stay quiet.
        $this->assertSame(1, $service->ringDue(Carbon::parse('2026-10-06 03:01', 'UTC')));
        $this->assertSame(0, $service->ringDue(Carbon::parse('2026-10-06 03:05', 'UTC')));

        Notification::assertSentToTimes($this->student, AlarmNotification::class, 1);

        // Friday 2026-10-09: both ring.
        $this->assertSame(2, $service->ringDue(Carbon::parse('2026-10-09 03:02', 'UTC')));
        // Missed by more than half an hour: waits for the next day.
        $this->assertSame(0, $service->ringDue(Carbon::parse('2026-10-10 03:45', 'UTC')));
    }

    public function test_a_dismissed_alarm_stays_quiet_for_the_rest_of_the_day(): void
    {
        Notification::fake();
        $alarm = Alarm::factory()->for($this->student)->create(['ring_at' => '06:00']);

        $this->travelTo(Carbon::parse('2026-10-06 02:30', 'UTC'));
        $this->actingAs($this->student)->post(route('alarms.dismiss', $alarm))->assertRedirect();

        $this->assertSame('2026-10-06', $alarm->fresh()->last_dismissed_on->toDateString());
        $this->assertSame(0, app(Alarms::class)->ringDue(Carbon::parse('2026-10-06 03:01', 'UTC')));
        $this->assertSame(1, app(Alarms::class)->ringDue(Carbon::parse('2026-10-07 03:01', 'UTC')));
    }

    public function test_the_command_rings_the_due_alarms_and_the_notification_stays_on_screen(): void
    {
        Notification::fake();
        $this->travelTo(Carbon::parse('2026-10-06 03:00', 'UTC'));
        $alarm = Alarm::factory()->for($this->student)->create(['ring_at' => '06:00']);

        $this->artisan('alarms:ring')->assertSuccessful();

        Notification::assertSentTo($this->student, AlarmNotification::class);

        $notification = new AlarmNotification($alarm);
        $push = $notification->toWebPush($this->student);

        $this->assertTrue($push['sticky']);
        $this->assertSame('alarm-'.$alarm->id, $push['tag']);
        $this->assertNotContains('mail', $notification->via($this->student));
    }

    public function test_the_active_alarms_are_shared_with_every_page_and_listed_on_their_own(): void
    {
        Alarm::factory()->for($this->student)->create(['ring_at' => '21:00', 'title' => 'المراجعة']);
        Alarm::factory()->for($this->student)->off()->create(['ring_at' => '05:00']);

        $this->actingAs($this->student)
            ->get(route('alarms.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('alarms/index')
                ->has('alarms', 2)
                ->has('alarms.1', fn (AssertableInertia $alarm) => $alarm->where('title', 'المراجعة')->where('time', '21:00')->where('days', null)->etc()));

        $this->actingAs($this->student)
            ->get(route('dashboard'))
            ->assertInertia(fn (AssertableInertia $page) => $page->has('alarms', 1)->where('alarms.0.title', 'المراجعة'));
    }
}
