<?php

namespace App\Services;

use App\Enums\AttendanceStatus;
use App\Enums\Grade;
use App\Enums\ProgressType;
use App\Enums\SessionStatus;
use App\Models\Attendance;
use App\Models\Halaqa;
use App\Models\HalaqaSession;
use App\Models\ProgressRecord;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Aggregations used by the dashboards and the reports pages.
 */
class Reports
{
    /**
     * Attendance matrix (students x sessions) of a halaqa in a date range.
     *
     * @return array{sessions: list<array<string, mixed>>, rows: list<array<string, mixed>>, summary: array<string, int|null>}
     */
    public function attendance(Halaqa $halaqa, CarbonInterface $from, CarbonInterface $to): array
    {
        $sessions = $halaqa->sessions()
            ->where('status', '!=', SessionStatus::Cancelled)
            ->whereBetween('starts_at', [$from->copy()->utc(), $to->copy()->utc()])
            ->where('starts_at', '<=', now())
            ->orderBy('starts_at')
            ->get(['id', 'title', 'starts_at', 'status', 'duration_minutes']);

        $attendances = Attendance::query()
            ->whereIn('halaqa_session_id', $sessions->pluck('id'))
            ->get(['halaqa_session_id', 'student_id', 'status']);

        $matrix = [];

        foreach ($attendances as $attendance) {
            $matrix[$attendance->student_id][$attendance->halaqa_session_id] = $attendance->status;
        }

        $students = User::query()
            ->whereIn('id', $halaqa->students()->pluck('users.id')->merge($attendances->pluck('student_id'))->unique())
            ->orderBy('name')
            ->get(['id', 'name', 'avatar_path']);

        $totals = ['present' => 0, 'late' => 0, 'absent' => 0, 'excused' => 0];

        $rows = $students->map(function (User $student) use ($sessions, $matrix, &$totals): array {
            $statuses = $sessions->map(fn (HalaqaSession $session): ?AttendanceStatus => $matrix[$student->id][$session->id] ?? null);
            $counts = $this->countStatuses($statuses);

            foreach ($counts as $key => $value) {
                $totals[$key] += $value;
            }

            return [
                'student' => ['id' => $student->id, 'name' => $student->name, 'avatar_url' => $student->avatar_url],
                'statuses' => $statuses->map(fn (?AttendanceStatus $status): ?string => $status?->value)->values()->all(),
                ...$counts,
                'rate' => $this->rate($counts['present'] + $counts['late'], $counts['absent']),
            ];
        });

        return [
            'sessions' => $sessions->map(fn (HalaqaSession $session): array => [
                'id' => $session->id,
                'title' => $session->title,
                'starts_at' => $session->starts_at->toIso8601String(),
                'status' => $session->status->value,
            ])->values()->all(),
            'rows' => $rows->values()->all(),
            'summary' => [
                'sessions' => $sessions->count(),
                'students' => $students->count(),
                ...$totals,
                'rate' => $this->rate($totals['present'] + $totals['late'], $totals['absent']),
            ],
        ];
    }

    /**
     * Memorization, revision, grades and attendance per student in a date range.
     *
     * @param  Collection<int, User>  $students
     * @return array{rows: list<array<string, mixed>>, weekly: list<array<string, mixed>>, summary: array<string, mixed>}
     */
    public function progress(Collection $students, CarbonInterface $from, CarbonInterface $to, ?Halaqa $halaqa = null): array
    {
        $ids = $students->pluck('id');
        $fromDate = $from->toDateString();
        $toDate = $to->toDateString();

        $records = ProgressRecord::query()
            ->whereIn('student_id', $ids)
            ->whereBetween('recorded_on', [$fromDate, $toDate])
            ->when($halaqa, fn (Builder $query) => $query->where('halaqa_id', $halaqa->id))
            ->groupBy('student_id')
            ->selectRaw("student_id,
                SUM(CASE WHEN type = 'memorization' THEN ayahs_count ELSE 0 END) as memorized,
                SUM(CASE WHEN type = 'revision' THEN ayahs_count ELSE 0 END) as revised,
                COUNT(*) as records_count,
                SUM(mistakes) as mistakes,
                AVG(".Grade::scoreSql().') as score,
                MAX(recorded_on) as last_record_on')
            ->toBase()
            ->get()
            ->keyBy('student_id');

        $attendance = Attendance::query()
            ->join('halaqa_sessions', 'halaqa_sessions.id', '=', 'attendances.halaqa_session_id')
            ->whereIn('attendances.student_id', $ids)
            ->where('halaqa_sessions.status', '!=', SessionStatus::Cancelled->value)
            ->whereBetween('halaqa_sessions.starts_at', [$from->copy()->utc(), $to->copy()->utc()])
            ->when($halaqa, fn (Builder $query) => $query->where('halaqa_sessions.halaqa_id', $halaqa->id))
            ->groupBy('attendances.student_id')
            ->selectRaw("attendances.student_id as student_id,
                SUM(CASE WHEN attendances.status IN ('present', 'late') THEN 1 ELSE 0 END) as attended,
                SUM(CASE WHEN attendances.status = 'absent' THEN 1 ELSE 0 END) as absent")
            ->toBase()
            ->get()
            ->keyBy('student_id');

        $rows = $students->map(function (User $student) use ($records, $attendance): array {
            $record = $records->get($student->id);
            $presence = $attendance->get($student->id);
            $score = $record?->score !== null ? round((float) $record->score, 2) : null;

            return [
                'student' => ['id' => $student->id, 'name' => $student->name, 'avatar_url' => $student->avatar_url],
                'memorized' => (int) ($record->memorized ?? 0),
                'revised' => (int) ($record->revised ?? 0),
                'records_count' => (int) ($record->records_count ?? 0),
                'mistakes' => (int) ($record->mistakes ?? 0),
                'average_score' => $score,
                'average_grade' => $score !== null ? Grade::fromScore($score)->value : null,
                'last_record_on' => $record->last_record_on ?? null,
                'total_memorized' => $student->memorized_ayahs,
                'attendance_rate' => $this->rate((int) ($presence->attended ?? 0), (int) ($presence->absent ?? 0)),
            ];
        })->sortByDesc('memorized')->values();

        $scores = $rows->pluck('average_score')->filter(fn ($score): bool => $score !== null);

        return [
            'rows' => $rows->all(),
            'weekly' => $this->weeklyMemorization($ids->all(), $from, $to, $halaqa ? [$halaqa->id] : null),
            'summary' => [
                'students' => $rows->count(),
                'memorized' => $rows->sum('memorized'),
                'revised' => $rows->sum('revised'),
                'records_count' => $rows->sum('records_count'),
                'average_grade' => $scores->isNotEmpty() ? Grade::fromScore($scores->avg())->value : null,
            ],
        ];
    }

    /**
     * Attended and absent totals with the attendance rate.
     *
     * @param  list<int>|null  $halaqaIds
     * @return array{attended: int, absent: int, rate: int|null}
     */
    public function attendanceTotals(?array $halaqaIds, CarbonInterface $from, CarbonInterface $to): array
    {
        $totals = Attendance::query()
            ->join('halaqa_sessions', 'halaqa_sessions.id', '=', 'attendances.halaqa_session_id')
            ->where('halaqa_sessions.status', '!=', SessionStatus::Cancelled->value)
            ->whereBetween('halaqa_sessions.starts_at', [$from->copy()->utc(), $to->copy()->utc()])
            ->when($halaqaIds !== null, fn (Builder $query) => $query->whereIn('halaqa_sessions.halaqa_id', $halaqaIds))
            ->selectRaw("SUM(CASE WHEN attendances.status IN ('present', 'late') THEN 1 ELSE 0 END) as attended,
                SUM(CASE WHEN attendances.status = 'absent' THEN 1 ELSE 0 END) as absent")
            ->toBase()
            ->first();

        $attended = (int) ($totals->attended ?? 0);
        $absent = (int) ($totals->absent ?? 0);

        return ['attended' => $attended, 'absent' => $absent, 'rate' => $this->rate($attended, $absent)];
    }

    /**
     * Memorized and revised ayahs grouped into 7-day buckets.
     *
     * @param  list<int>|null  $studentIds
     * @param  list<int>|null  $halaqaIds
     * @return list<array{label: string, memorized: int, revised: int}>
     */
    public function weeklyMemorization(?array $studentIds, CarbonInterface $from, CarbonInterface $to, ?array $halaqaIds = null): array
    {
        $daily = ProgressRecord::query()
            ->when($studentIds !== null, fn (Builder $query) => $query->whereIn('student_id', $studentIds))
            ->when($halaqaIds !== null, fn (Builder $query) => $query->whereIn('halaqa_id', $halaqaIds))
            ->whereBetween('recorded_on', [$from->toDateString(), $to->toDateString()])
            ->groupBy('recorded_on', 'type')
            ->selectRaw('recorded_on as day, type, SUM(ayahs_count) as ayahs')
            ->toBase()
            ->get();

        $buckets = $this->buckets($from, $to);

        foreach ($daily as $row) {
            $index = $this->bucketIndex($buckets, (string) $row->day);

            if ($index !== null) {
                $key = $row->type === ProgressType::Memorization->value ? 'memorized' : 'revised';
                $buckets[$index][$key] += (int) $row->ayahs;
            }
        }

        return array_map(fn (array $bucket): array => [
            'label' => $bucket['start'],
            'memorized' => $bucket['memorized'],
            'revised' => $bucket['revised'],
        ], $buckets);
    }

    /**
     * Attendance rate grouped into 7-day buckets.
     *
     * @param  list<int>|null  $halaqaIds
     * @return list<array{label: string, rate: int|null, attended: int, absent: int}>
     */
    public function weeklyAttendance(?array $halaqaIds, CarbonInterface $from, CarbonInterface $to): array
    {
        $daily = Attendance::query()
            ->join('halaqa_sessions', 'halaqa_sessions.id', '=', 'attendances.halaqa_session_id')
            ->where('halaqa_sessions.status', '!=', SessionStatus::Cancelled->value)
            ->whereBetween('halaqa_sessions.starts_at', [$from->copy()->utc(), $to->copy()->utc()])
            ->when($halaqaIds !== null, fn (Builder $query) => $query->whereIn('halaqa_sessions.halaqa_id', $halaqaIds))
            ->groupBy(DB::raw('DATE(halaqa_sessions.starts_at)'))
            ->selectRaw("DATE(halaqa_sessions.starts_at) as day,
                SUM(CASE WHEN attendances.status IN ('present', 'late') THEN 1 ELSE 0 END) as attended,
                SUM(CASE WHEN attendances.status = 'absent' THEN 1 ELSE 0 END) as absent")
            ->toBase()
            ->get();

        $buckets = $this->buckets($from, $to);

        foreach ($daily as $row) {
            $index = $this->bucketIndex($buckets, (string) $row->day);

            if ($index !== null) {
                $buckets[$index]['attended'] += (int) $row->attended;
                $buckets[$index]['absent'] += (int) $row->absent;
            }
        }

        return array_map(fn (array $bucket): array => [
            'label' => $bucket['start'],
            'rate' => $this->rate($bucket['attended'], $bucket['absent']),
            'attended' => $bucket['attended'],
            'absent' => $bucket['absent'],
        ], $buckets);
    }

    /**
     * Attendance rate in percent, ignoring excused absences.
     */
    public function rate(int $attended, int $absent): ?int
    {
        $total = $attended + $absent;

        return $total > 0 ? (int) round($attended / $total * 100) : null;
    }

    /**
     * @param  Collection<int, AttendanceStatus|null>  $statuses
     * @return array{present: int, late: int, absent: int, excused: int}
     */
    protected function countStatuses(Collection $statuses): array
    {
        $counts = ['present' => 0, 'late' => 0, 'absent' => 0, 'excused' => 0];

        foreach ($statuses as $status) {
            if ($status !== null) {
                $counts[$status->value]++;
            }
        }

        return $counts;
    }

    /**
     * Consecutive 7-day buckets ending on the "to" date.
     *
     * @return list<array{start: string, end: string, memorized: int, revised: int, attended: int, absent: int}>
     */
    protected function buckets(CarbonInterface $from, CarbonInterface $to): array
    {
        $end = CarbonImmutable::parse($to->toDateString());
        $start = CarbonImmutable::parse($from->toDateString());
        $buckets = [];

        while ($end->greaterThanOrEqualTo($start)) {
            $bucketStart = $end->subDays(6)->max($start);
            array_unshift($buckets, [
                'start' => $bucketStart->toDateString(),
                'end' => $end->toDateString(),
                'memorized' => 0,
                'revised' => 0,
                'attended' => 0,
                'absent' => 0,
            ]);
            $end = $bucketStart->subDay();
        }

        return $buckets;
    }

    /**
     * @param  list<array{start: string, end: string}>  $buckets
     */
    protected function bucketIndex(array $buckets, string $day): ?int
    {
        $day = substr($day, 0, 10);

        foreach ($buckets as $index => $bucket) {
            if ($day >= $bucket['start'] && $day <= $bucket['end']) {
                return $index;
            }
        }

        return null;
    }
}
