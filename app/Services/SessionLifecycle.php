<?php

namespace App\Services;

use App\Enums\AttendanceStatus;
use App\Enums\SessionStatus;
use App\Events\SessionUpdated;
use App\Exceptions\MeetingException;
use App\Models\Attendance;
use App\Models\HalaqaSession;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\SessionCancelled;
use App\Notifications\SessionEnded;
use App\Notifications\SessionStarted;
use App\Services\Meetings\MeetingManager;

/**
 * Starting, ending and cancelling sessions, and recording attendance.
 */
class SessionLifecycle
{
    public function __construct(
        protected MeetingManager $meetings,
        protected Notifier $notifier,
        protected AnnouncementDispatcher $announcements,
    ) {}

    /**
     * Open the session, invite the students to join and deliver the messages planned for it.
     * When the system opens it at its time ($automatic), the teacher is invited too.
     *
     * @throws MeetingException
     */
    public function start(HalaqaSession $session, bool $automatic = false): void
    {
        $this->meetings->ensure($session);

        if ($session->status === SessionStatus::Live) {
            return;
        }

        $session->update(['status' => SessionStatus::Live, 'started_at' => now()]);

        $recipients = $session->halaqa->students()->active()->get();

        if ($automatic && $session->teacher !== null) {
            $recipients->push($session->teacher);
        }

        $this->notifier->send($recipients, new SessionStarted($session));
        $this->announcements->deliverForSession($session);

        SessionUpdated::dispatch($session);
    }

    /**
     * Close the session, mark students who never joined as absent and tell everyone it ended.
     */
    public function end(HalaqaSession $session, ?User $by = null): void
    {
        $wasLive = $session->status === SessionStatus::Live;

        $session->update(['status' => SessionStatus::Completed, 'ended_at' => now()]);

        if (Setting::get('auto_mark_absent')) {
            $this->markAbsentees($session, $by);
        }

        if ($wasLive) {
            $this->meetings->end($session);

            $recipients = $session->halaqa->students()->active()->get();

            if ($session->teacher !== null && $session->teacher_id !== $by?->id) {
                $recipients->push($session->teacher);
            }

            $this->notifier->send($recipients, new SessionEnded($session));
        }

        SessionUpdated::dispatch($session);
    }

    public function cancel(HalaqaSession $session, ?string $reason, User $by): void
    {
        $session->update(['status' => SessionStatus::Cancelled, 'cancel_reason' => $reason]);

        $this->meetings->release($session);

        if ($session->endsAt()->isFuture()) {
            $recipients = $session->halaqa->students()->active()->get();

            if ($session->teacher !== null && $session->teacher_id !== $by->id) {
                $recipients->push($session->teacher);
            }

            $this->notifier->send($recipients, new SessionCancelled($session));
        }

        SessionUpdated::dispatch($session);
    }

    /**
     * Record that a student entered the meeting (present or late).
     */
    public function recordJoin(HalaqaSession $session, User $student): void
    {
        if (! $student->isStudent()) {
            return;
        }

        $attendance = Attendance::query()->firstOrNew([
            'halaqa_session_id' => $session->id,
            'student_id' => $student->id,
        ]);

        if ($attendance->exists && $attendance->joined_at !== null) {
            return;
        }

        $lateAfter = (int) Setting::get('late_after_minutes', 10);
        $isLate = now()->greaterThan($session->starts_at->copy()->addMinutes($lateAfter));

        if (! $attendance->exists || $attendance->status === AttendanceStatus::Absent) {
            $attendance->status = $isLate ? AttendanceStatus::Late : AttendanceStatus::Present;
        }

        $attendance->joined_at = now();
        $attendance->save();
    }

    /**
     * Mark enrolled students without an attendance record as absent.
     */
    public function markAbsentees(HalaqaSession $session, ?User $by = null): int
    {
        $recorded = $session->attendances()->pluck('student_id');

        $missing = $session->halaqa->students()
            ->whereNotIn('users.id', $recorded)
            ->where('halaqa_student.created_at', '<=', $session->starts_at)
            ->pluck('users.id');

        foreach ($missing as $studentId) {
            Attendance::query()->create([
                'halaqa_session_id' => $session->id,
                'student_id' => $studentId,
                'status' => AttendanceStatus::Absent,
                'recorded_by' => $by?->id,
            ]);
        }

        return $missing->count();
    }
}
