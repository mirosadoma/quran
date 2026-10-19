<?php

namespace App\Services\Exams;

use App\Enums\ExamEntryStatus;
use App\Enums\Grade;
use App\Events\ExamDayUpdated;
use App\Exceptions\ExamException;
use App\Models\ExamDay;
use App\Models\ExamEntry;
use App\Models\ExamExaminer;
use App\Notifications\ExamResultPublished;
use App\Notifications\ExamTurnNow;
use App\Notifications\ExamTurnSoon;
use App\Services\Notifier;
use Illuminate\Notifications\Notification;

/**
 * The queue of an examiner on an exam day: telling a student to get ready, calling them into
 * the private room, finishing with them, and the results.
 */
class ExamQueue
{
    public function __construct(protected Notifier $notifier) {}

    /**
     * Tell the student their turn is next.
     *
     * @throws ExamException
     */
    public function alert(ExamEntry $entry): void
    {
        $this->ensureLive($entry);

        if (! $entry->status->isPending()) {
            throw new ExamException(__('This student is not waiting for their turn.'));
        }

        $entry->update(['status' => ExamEntryStatus::Alerted, 'alerted_at' => now()]);

        $this->notifyStudent($entry, new ExamTurnSoon($entry));
        $this->touch($entry);
    }

    /**
     * Call the student into the private room of their examiner.
     *
     * @throws ExamException
     */
    public function call(ExamEntry $entry): void
    {
        $this->ensureLive($entry);

        if ($entry->status === ExamEntryStatus::Called) {
            return;
        }

        if ($entry->status === ExamEntryStatus::Examined) {
            throw new ExamException(__('This student has already been examined.'));
        }

        $busy = ExamEntry::query()
            ->where('exam_day_id', $entry->exam_day_id)
            ->where('examiner_id', $entry->examiner_id)
            ->where('status', ExamEntryStatus::Called)
            ->whereKeyNot($entry->id)
            ->with('student')
            ->first();

        if ($busy !== null && $entry->examiner_id !== null) {
            throw new ExamException(__('Finish with :name first.', ['name' => $busy->student?->name ?? __('the current student')]));
        }

        $entry->update(['status' => ExamEntryStatus::Called, 'called_at' => now()]);

        $this->notifyStudent($entry, new ExamTurnNow($entry));
        $this->touch($entry);
    }

    /**
     * The examination of the student is over; the result may be recorded at the same time.
     *
     * @throws ExamException
     */
    public function finish(ExamEntry $entry, ?Grade $grade = null, ?int $score = null, ?string $notes = null, ?ExamExaminer $by = null): void
    {
        $this->ensureLive($entry);

        $attributes = ['status' => ExamEntryStatus::Examined, 'finished_at' => now()];

        if ($grade !== null || $score !== null) {
            $attributes = [...$attributes, ...$this->gradeAttributes($grade, $score, $notes, $by)];
        }

        $entry->update($attributes);
        $this->touch($entry);
    }

    /**
     * Record (or change) the result of the student.
     */
    public function grade(ExamEntry $entry, ?Grade $grade, ?int $score, ?string $notes, ?ExamExaminer $by = null): void
    {
        $attributes = $this->gradeAttributes($grade, $score, $notes, $by);

        if ($entry->status->isPending() || $entry->status === ExamEntryStatus::Called) {
            $attributes['status'] = ExamEntryStatus::Examined;
            $attributes['finished_at'] = $entry->finished_at ?? now();
        }

        $entry->update($attributes);
        $this->touch($entry);
    }

    /**
     * Remove the result of the student (it is not sent to them).
     */
    public function clearGrade(ExamEntry $entry): void
    {
        $entry->update(['grade' => null, 'score' => null, 'notes' => null, 'graded_by' => null, 'graded_at' => null, 'published_at' => null]);
        $this->touch($entry);
    }

    /**
     * The student did not show up.
     */
    public function markAbsent(ExamEntry $entry): void
    {
        $entry->update(['status' => ExamEntryStatus::Absent]);
        $this->touch($entry);
    }

    /**
     * Put the student back in the queue.
     */
    public function reset(ExamEntry $entry): void
    {
        $entry->update(['status' => ExamEntryStatus::Waiting, 'alerted_at' => null, 'called_at' => null]);
        $this->touch($entry);
    }

    /**
     * Send the student their result.
     *
     * @throws ExamException
     */
    public function publish(ExamEntry $entry): void
    {
        if (! $entry->isGraded()) {
            throw new ExamException(__('Record the result first.'));
        }

        $entry->update(['published_at' => now()]);
        $this->notifyStudent($entry, new ExamResultPublished($entry));
    }

    /**
     * Send every graded, unpublished result of the day.
     *
     * @return int the number of results sent
     */
    public function publishAll(ExamDay $day): int
    {
        $entries = $day->entries()
            ->whereNull('published_at')
            ->where(fn ($query) => $query->whereNotNull('grade')->orWhereNotNull('score'))
            ->with(['student', 'day.exam'])
            ->get();

        foreach ($entries as $entry) {
            $this->publish($entry);
        }

        return $entries->count();
    }

    /**
     * @return array<string, mixed>
     */
    protected function gradeAttributes(?Grade $grade, ?int $score, ?string $notes, ?ExamExaminer $by): array
    {
        return [
            'grade' => $grade,
            'score' => $score,
            'notes' => $notes,
            'graded_by' => $by?->id,
            'graded_at' => now(),
        ];
    }

    /**
     * @throws ExamException
     */
    protected function ensureLive(ExamEntry $entry): void
    {
        $day = $entry->relationLoaded('day') ? $entry->day : $entry->day()->first();

        if ($day === null || ! $day->isLive()) {
            throw new ExamException(__('The exam day is not open.'));
        }
    }

    protected function notifyStudent(ExamEntry $entry, Notification $notification): void
    {
        $student = $entry->relationLoaded('student') ? $entry->student : $entry->student()->first();

        if ($student !== null && $student->is_active) {
            $this->notifier->send($student, $notification);
        }
    }

    protected function touch(ExamEntry $entry): void
    {
        $day = $entry->relationLoaded('day') ? $entry->day : $entry->day()->first();

        if ($day !== null) {
            ExamDayUpdated::dispatch($day);
        }
    }
}
