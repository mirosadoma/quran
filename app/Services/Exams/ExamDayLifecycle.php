<?php

namespace App\Services\Exams;

use App\Enums\ExamDayPhase;
use App\Enums\ExamDayStatus;
use App\Enums\ExamEntryStatus;
use App\Events\ExamDayUpdated;
use App\Exceptions\ExamException;
use App\Models\ExamDay;
use App\Models\ExamEntry;
use App\Models\ExamExaminer;
use App\Models\User;
use App\Notifications\ExamDayOpened;
use App\Notifications\ExamExaminingStarted;
use App\Notifications\ExamReminder;
use App\Services\Notifier;
use Illuminate\Support\Collection;

/**
 * Opening and closing exam days, and moving them from the opening word to the examining.
 */
class ExamDayLifecycle
{
    public function __construct(
        protected ExamRooms $rooms,
        protected ExamDistributor $distributor,
        protected Notifier $notifier,
    ) {}

    /**
     * Open the day: everyone may enter the main hall, and the students and examiners are told.
     *
     * @throws ExamException
     */
    public function open(ExamDay $day, ?User $by = null): void
    {
        if ($day->isClosed()) {
            throw new ExamException(__('This exam day is closed.'));
        }

        if ($day->isLive()) {
            return;
        }

        $this->distributor->syncStudents($day);
        $this->rooms->ensureMainRoom($day);

        foreach ($day->examiners()->get() as $examiner) {
            $this->rooms->ensureExaminerRooms($examiner);
        }

        $day->update([
            'status' => ExamDayStatus::Live,
            'phase' => ExamDayPhase::Opening,
            'opened_at' => now(),
            'opened_by' => $by?->id,
        ]);

        $this->notifier->send($this->participants($day, except: $by), new ExamDayOpened($day));

        ExamDayUpdated::dispatch($day);
    }

    /**
     * After the opening word: every student goes to the hall of their examiner.
     *
     * @throws ExamException
     */
    public function startExamining(ExamDay $day): void
    {
        if (! $day->isLive()) {
            throw new ExamException(__('Open the exam day first.'));
        }

        if ($day->phase === ExamDayPhase::Examining) {
            return;
        }

        $day->update(['phase' => ExamDayPhase::Examining, 'examining_started_at' => now()]);

        $entries = $day->entries()->with(['student', 'examiner'])->get();

        foreach ($entries as $entry) {
            if ($entry->student !== null && $entry->student->is_active && $entry->status->isPending()) {
                $this->notifier->send($entry->student, new ExamExaminingStarted($entry));
            }
        }

        ExamDayUpdated::dispatch($day);
    }

    /**
     * Close the day. Students who were never examined are marked absent (they can still be graded).
     */
    public function close(ExamDay $day, ?User $by = null): int
    {
        if ($day->isClosed()) {
            return 0;
        }

        $day->update(['status' => ExamDayStatus::Closed, 'closed_at' => now()]);

        $absent = $day->entries()
            ->whereIn('status', [ExamEntryStatus::Waiting, ExamEntryStatus::Alerted, ExamEntryStatus::Called])
            ->update(['status' => ExamEntryStatus::Absent]);

        ExamDayUpdated::dispatch($day);

        return $absent;
    }

    /**
     * Remind the students and examiners of the day (the day before, and shortly before it starts).
     */
    public function remind(ExamDay $day, bool $dayBefore): void
    {
        $day->forceFill([$dayBefore ? 'reminder_day_before_sent_at' : 'reminder_sent_at' => now()])->save();

        $this->notifier->send($this->participants($day), new ExamReminder($day, $dayBefore));
    }

    /**
     * Everyone taking part in the day: its students and the examiners who have an account.
     *
     * @return Collection<int, User>
     */
    public function participants(ExamDay $day, ?User $except = null): Collection
    {
        $students = $day->entries()->with('student')->get()
            ->map(fn (ExamEntry $entry): ?User => $entry->student)
            ->filter(fn (?User $student): bool => $student !== null && $student->is_active);

        $examiners = $day->examiners()->with('user')->get()
            ->map(fn (ExamExaminer $examiner): ?User => $examiner->user)
            ->filter(fn (?User $user): bool => $user !== null && $user->is_active);

        return $students->concat($examiners)
            ->unique('id')
            ->reject(fn (User $user): bool => $except !== null && $user->id === $except->id)
            ->values();
    }
}
