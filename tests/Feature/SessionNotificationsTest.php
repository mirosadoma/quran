<?php

namespace Tests\Feature;

use App\Enums\SessionStatus;
use App\Models\Halaqa;
use App\Models\HalaqaSession;
use App\Models\ProgressRecord;
use App\Models\RecitationSubmission;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\ProgressRecorded;
use App\Notifications\RecitationSubmitted;
use App\Notifications\SessionEnded;
use App\Notifications\SessionStarted;
use App\Services\SessionLifecycle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class SessionNotificationsTest extends TestCase
{
    use RefreshDatabase;

    protected User $teacher;

    protected User $student;

    protected Halaqa $halaqa;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->teacher = User::factory()->teacher()->create();
        $this->student = User::factory()->student()->create();
        $this->halaqa = Halaqa::factory()->create(['teacher_id' => $this->teacher->id]);
        $this->halaqa->students()->attach($this->student);
    }

    protected function sessionStartingAt(\DateTimeInterface $startsAt): HalaqaSession
    {
        return HalaqaSession::factory()->create([
            'halaqa_id' => $this->halaqa->id,
            'teacher_id' => $this->teacher->id,
            'starts_at' => $startsAt,
        ]);
    }

    public function test_sessions_start_at_their_time_and_invite_students_and_teacher(): void
    {
        $due = $this->sessionStartingAt(now()->subMinutes(2));
        $later = $this->sessionStartingAt(now()->addHour());

        $this->artisan('sessions:start')->assertSuccessful();

        $this->assertSame(SessionStatus::Live, $due->fresh()->status);
        $this->assertSame(SessionStatus::Scheduled, $later->fresh()->status);

        Notification::assertSentTo($this->student, SessionStarted::class);
        Notification::assertSentTo($this->teacher, SessionStarted::class, function (SessionStarted $notification) use ($due): bool {
            return str_contains($notification->body($this->teacher), $due->displayTitle());
        });
    }

    public function test_sessions_are_not_started_when_the_setting_is_off(): void
    {
        Setting::put(['auto_start_sessions' => false]);
        $due = $this->sessionStartingAt(now()->subMinutes(2));

        $this->artisan('sessions:start')->assertSuccessful();

        $this->assertSame(SessionStatus::Scheduled, $due->fresh()->status);
        Notification::assertNothingSent();
    }

    public function test_the_end_of_a_live_session_is_announced(): void
    {
        $session = $this->sessionStartingAt(now()->subHour());
        $session->update(['status' => SessionStatus::Live]);

        app(SessionLifecycle::class)->end($session);

        $this->assertSame(SessionStatus::Completed, $session->fresh()->status);
        Notification::assertSentTo($this->student, SessionEnded::class);
        Notification::assertSentTo($this->teacher, SessionEnded::class);
    }

    public function test_the_teacher_who_ends_the_session_is_not_notified(): void
    {
        $session = $this->sessionStartingAt(now()->subHour());
        $session->update(['status' => SessionStatus::Live]);

        app(SessionLifecycle::class)->end($session, $this->teacher);

        Notification::assertSentTo($this->student, SessionEnded::class);
        Notification::assertNotSentTo($this->teacher, SessionEnded::class);
    }

    public function test_recitation_notifications_open_the_right_place(): void
    {
        $submission = RecitationSubmission::factory()->create(['student_id' => $this->student->id, 'halaqa_id' => $this->halaqa->id]);

        $this->assertSame(
            route('halaqat.show', ['halaqa' => $this->halaqa->id, 'tab' => 'students', 'submission' => $submission->id]),
            (new RecitationSubmitted($submission->load('student')))->url(),
        );

        $record = ProgressRecord::factory()->create(['student_id' => $this->student->id, 'halaqa_id' => $this->halaqa->id, 'mistakes' => 2]);
        $notification = new ProgressRecorded($record);

        $this->assertSame(route('halaqat.show', ['halaqa' => $this->halaqa->id, 'tab' => 'records']), $notification->url());
        $this->assertStringContainsString($record->grade->label(), $notification->body($this->student));
    }
}
