<?php

namespace App\Services;

use App\Enums\AttendanceStatus;
use App\Enums\Grade;
use App\Enums\ProgressType;
use App\Enums\SessionStatus;
use App\Models\Attendance;
use App\Models\ProgressRecord;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;

/**
 * Computes a student's memorization coverage, grades and attendance.
 */
class StudentProgress
{
    public function __construct(protected Quran $quran) {}

    /**
     * Absolute ranges of every accepted memorization record.
     *
     * @return list<array{0: int, 1: int}>
     */
    public function memorizedRanges(User $student): array
    {
        return ProgressRecord::query()
            ->where('student_id', $student->id)
            ->where('type', ProgressType::Memorization)
            ->where(fn (Builder $query) => $query->whereNull('grade')->orWhere('grade', '!=', Grade::Weak))
            ->get(['from_surah', 'from_ayah', 'to_surah', 'to_ayah'])
            ->map(fn (ProgressRecord $record): array => [
                $this->quran->absolute($record->from_surah, $record->from_ayah),
                $this->quran->absolute($record->to_surah, $record->to_ayah),
            ])
            ->all();
    }

    /**
     * @return array{ayahs: int, percent: float, completed_juz: int, completed_surahs: int, juz: list<array{number: int, covered: int, total: int}>, surahs: list<array{number: int, covered: int, total: int}>}
     */
    public function coverage(User $student): array
    {
        return $this->quran->coverage($this->memorizedRanges($student));
    }

    /**
     * Recalculate and store the student's memorized ayah total.
     */
    public function refresh(User $student): void
    {
        $student->forceFill(['memorized_ayahs' => $this->coverage($student)['ayahs']])->saveQuietly();
    }

    /**
     * End of the student's latest memorization portion.
     *
     * @return array{surah: int, ayah: int}|null
     */
    public function lastMemorizedPosition(User $student): ?array
    {
        $record = ProgressRecord::query()
            ->where('student_id', $student->id)
            ->where('type', ProgressType::Memorization)
            ->latest('recorded_on')
            ->latest('id')
            ->first(['to_surah', 'to_ayah']);

        return $record ? ['surah' => $record->to_surah, 'ayah' => $record->to_ayah] : null;
    }

    /**
     * Attendance totals for completed sessions in an optional date range.
     *
     * @return array{total: int, present: int, late: int, absent: int, excused: int, rate: int|null}
     */
    public function attendance(User $student, ?CarbonInterface $from = null, ?CarbonInterface $to = null): array
    {
        $counts = Attendance::query()
            ->where('student_id', $student->id)
            ->whereHas('session', function (Builder $query) use ($from, $to): void {
                $query->where('status', '!=', SessionStatus::Cancelled)
                    ->when($from, fn (Builder $query) => $query->where('starts_at', '>=', $from->copy()->utc()))
                    ->when($to, fn (Builder $query) => $query->where('starts_at', '<=', $to->copy()->utc()));
            })
            ->selectRaw('status, count(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status');

        $present = (int) ($counts[AttendanceStatus::Present->value] ?? 0);
        $late = (int) ($counts[AttendanceStatus::Late->value] ?? 0);
        $absent = (int) ($counts[AttendanceStatus::Absent->value] ?? 0);
        $excused = (int) ($counts[AttendanceStatus::Excused->value] ?? 0);
        $total = $present + $late + $absent + $excused;
        $counted = $total - $excused;

        return [
            'total' => $total,
            'present' => $present,
            'late' => $late,
            'absent' => $absent,
            'excused' => $excused,
            'rate' => $counted > 0 ? (int) round(($present + $late) / $counted * 100) : null,
        ];
    }

    /**
     * Average grade score (1 - 5) of the student's records in an optional range.
     */
    public function averageScore(User $student, ?CarbonInterface $from = null, ?CarbonInterface $to = null): ?float
    {
        $average = ProgressRecord::query()
            ->where('student_id', $student->id)
            ->whereNotNull('grade')
            ->when($from, fn (Builder $query) => $query->whereDate('recorded_on', '>=', $from))
            ->when($to, fn (Builder $query) => $query->whereDate('recorded_on', '<=', $to))
            ->selectRaw('AVG('.Grade::scoreSql().') as score')
            ->value('score');

        return $average === null ? null : round((float) $average, 2);
    }

    /**
     * Full progress overview used on the student's progress page.
     *
     * @return array<string, mixed>
     */
    public function summary(User $student): array
    {
        $coverage = $this->coverage($student);
        $average = $this->averageScore($student);
        $monthStart = now()->startOfMonth();

        $memorizedThisMonth = (int) ProgressRecord::query()
            ->where('student_id', $student->id)
            ->where('type', ProgressType::Memorization)
            ->whereDate('recorded_on', '>=', $monthStart)
            ->sum('ayahs_count');

        $revisedThisMonth = (int) ProgressRecord::query()
            ->where('student_id', $student->id)
            ->where('type', ProgressType::Revision)
            ->whereDate('recorded_on', '>=', $monthStart)
            ->sum('ayahs_count');

        return [
            'coverage' => $coverage,
            'average_score' => $average,
            'average_grade' => $average === null ? null : Grade::fromScore($average)->value,
            'memorized_this_month' => $memorizedThisMonth,
            'revised_this_month' => $revisedThisMonth,
            'records_count' => ProgressRecord::query()->where('student_id', $student->id)->count(),
            'last_record_on' => ProgressRecord::query()->where('student_id', $student->id)->max('recorded_on'),
            'attendance' => $this->attendance($student),
        ];
    }
}
