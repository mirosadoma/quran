<?php

namespace App\Services\Exams;

use App\Enums\ExamEntryStatus;
use App\Models\ExamDay;
use App\Models\ExamEntry;
use App\Models\User;
use Illuminate\Support\Collection;

/**
 * Which students are examined on a day, and how they are shared among the examiners.
 */
class ExamDistributor
{
    /**
     * Add the students of the day's halaqat who are not in the day yet, and remove the ones who
     * left its halaqat as long as they were not examined or graded.
     *
     * @return int the number of students added
     */
    public function syncStudents(ExamDay $day): int
    {
        $halaqat = $day->halaqat()->with(['students' => fn ($query) => $query->active()->orderBy('name')])->get();
        $existing = $day->entries()->get()->keyBy('student_id');
        $seen = [];
        $added = 0;

        foreach ($halaqat as $halaqa) {
            foreach ($halaqa->students as $student) {
                if (isset($seen[$student->id])) {
                    continue;
                }

                $seen[$student->id] = true;

                if ($existing->has($student->id)) {
                    continue;
                }

                $day->entries()->create([
                    'student_id' => $student->id,
                    'halaqa_id' => $halaqa->id,
                    'position' => $existing->count() + $added + 1,
                ]);

                $added++;
            }
        }

        foreach ($existing as $entry) {
            if (! isset($seen[$entry->student_id]) && $entry->status->isPending() && ! $entry->isGraded()) {
                $entry->delete();
            }
        }

        return $added;
    }

    /**
     * Share the students of the day evenly among its examiners (students of the same halaqa
     * stay together as far as possible), and number the queue of every examiner.
     *
     * @param  bool  $onlyUnassigned  keep the students who already have an examiner
     */
    public function autoAssign(ExamDay $day, bool $onlyUnassigned = false): void
    {
        $examinerIds = $day->examiners()->pluck('id')->map(fn ($id): int => (int) $id)->all();

        if ($examinerIds === []) {
            return;
        }

        $entries = $day->entries()->with('student')->get();

        /** @var array<int, int> $counts students already with each examiner */
        $counts = array_fill_keys($examinerIds, 0);

        if ($onlyUnassigned) {
            foreach ($entries as $entry) {
                if ($entry->examiner_id !== null && array_key_exists($entry->examiner_id, $counts)) {
                    $counts[$entry->examiner_id]++;
                }
            }
        }

        $pending = $entries
            ->filter(fn (ExamEntry $entry): bool => ! $onlyUnassigned || $entry->examiner_id === null || ! array_key_exists($entry->examiner_id, $counts))
            ->sortBy([fn (ExamEntry $a, ExamEntry $b): int => ($a->halaqa_id <=> $b->halaqa_id) ?: strcmp($a->student?->name ?? '', $b->student?->name ?? '')])
            ->values();

        foreach ($pending as $entry) {
            // The examiner with the fewest students so far (the first one added breaks ties).
            $examinerId = array_search(min($counts), $counts, true);

            $entry->examiner_id = $examinerId;
            $entry->save();
            $counts[$examinerId]++;
        }

        $this->renumber($day);
    }

    /**
     * Apply the manager's own distribution: the examiner and the position of every student.
     *
     * @param  list<array{entry_id: int, examiner_id: int|null, position: int}>  $assignments
     */
    public function apply(ExamDay $day, array $assignments): void
    {
        $examinerIds = $day->examiners()->pluck('id')->map(fn ($id): int => (int) $id)->all();
        $entries = $day->entries()->get()->keyBy('id');

        foreach ($assignments as $assignment) {
            $entry = $entries->get((int) $assignment['entry_id']);

            if ($entry === null) {
                continue;
            }

            $examinerId = $assignment['examiner_id'] !== null ? (int) $assignment['examiner_id'] : null;

            $entry->examiner_id = $examinerId !== null && in_array($examinerId, $examinerIds, true) ? $examinerId : null;
            $entry->position = max(0, (int) $assignment['position']);
            $entry->save();
        }

        $this->renumber($day);
    }

    /**
     * Number every examiner's queue 1, 2, 3... in the current order.
     */
    public function renumber(ExamDay $day): void
    {
        $day->entries()->get()
            ->groupBy(fn (ExamEntry $entry): string => (string) $entry->examiner_id)
            ->each(function (Collection $group): void {
                $group->sortBy([['position', 'asc'], ['id', 'asc']])->values()->each(function (ExamEntry $entry, int $index): void {
                    if ($entry->position !== $index + 1) {
                        $entry->forceFill(['position' => $index + 1])->saveQuietly();
                    }
                });
            });
    }

    /**
     * The students of the day's halaqat who are not examined, to show the manager.
     *
     * @return Collection<int, User>
     */
    public function missingStudents(ExamDay $day): Collection
    {
        $examined = $day->entries()->pluck('student_id');

        return User::query()
            ->students()
            ->active()
            ->whereIn('id', fn ($query) => $query->select('student_id')->from('halaqa_student')->whereIn('halaqa_id', $day->halaqat()->select('halaqat.id')))
            ->whereNotIn('id', $examined)
            ->orderBy('name')
            ->get();
    }

    /**
     * Results summary of the day.
     *
     * @return array{students: int, examined: int, graded: int, published: int, pending: int}
     */
    public function summary(ExamDay $day): array
    {
        $entries = $day->relationLoaded('entries') ? $day->entries : $day->entries()->get();

        return [
            'students' => $entries->count(),
            'examined' => $entries->where('status', ExamEntryStatus::Examined)->count(),
            'graded' => $entries->filter(fn (ExamEntry $entry): bool => $entry->isGraded())->count(),
            'published' => $entries->filter(fn (ExamEntry $entry): bool => $entry->isPublished())->count(),
            'pending' => $entries->filter(fn (ExamEntry $entry): bool => $entry->status->isPending() || $entry->status === ExamEntryStatus::Called)->count(),
        ];
    }
}
