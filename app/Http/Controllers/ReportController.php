<?php

namespace App\Http\Controllers;

use App\Enums\AttendanceStatus;
use App\Enums\Grade;
use App\Enums\ProgressType;
use App\Enums\SessionStatus;
use App\Http\Resources\ProgressRecordResource;
use App\Http\Resources\UserResource;
use App\Models\Attendance;
use App\Models\Halaqa;
use App\Models\HalaqaSession;
use App\Models\ProgressRecord;
use App\Models\User;
use App\Services\Quran;
use App\Services\Reports;
use App\Services\StudentProgress;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    public function __construct(
        protected Reports $reports,
        protected StudentProgress $progress,
        protected Quran $quran,
    ) {}

    /**
     * Reports overview with a summary per halaqa.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $halaqat = $user->accessibleHalaqat()->with('teacher:id,name')->withCount('students')->orderBy('name')->get();
        $halaqaIds = $halaqat->pluck('id')->all();
        $from = now()->subDays(29)->startOfDay();

        $attendance = Attendance::query()
            ->join('halaqa_sessions', 'halaqa_sessions.id', '=', 'attendances.halaqa_session_id')
            ->whereIn('halaqa_sessions.halaqa_id', $halaqaIds)
            ->where('halaqa_sessions.starts_at', '>=', $from)
            ->where('halaqa_sessions.status', '!=', SessionStatus::Cancelled->value)
            ->groupBy('halaqa_sessions.halaqa_id')
            ->selectRaw("halaqa_sessions.halaqa_id as halaqa_id,
                SUM(CASE WHEN attendances.status IN ('present', 'late') THEN 1 ELSE 0 END) as attended,
                SUM(CASE WHEN attendances.status = 'absent' THEN 1 ELSE 0 END) as absent")
            ->toBase()
            ->get()
            ->keyBy('halaqa_id');

        $memorized = ProgressRecord::query()
            ->whereIn('halaqa_id', $halaqaIds)
            ->where('type', ProgressType::Memorization)
            ->where('recorded_on', '>=', $from->toDateString())
            ->groupBy('halaqa_id')
            ->selectRaw('halaqa_id, SUM(ayahs_count) as ayahs')
            ->toBase()
            ->pluck('ayahs', 'halaqa_id');

        $sessions = HalaqaSession::query()
            ->whereIn('halaqa_id', $halaqaIds)
            ->where('starts_at', '>=', $from)
            ->where('starts_at', '<=', now())
            ->groupBy('halaqa_id')
            ->selectRaw("halaqa_id,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled")
            ->toBase()
            ->get()
            ->keyBy('halaqa_id');

        $rows = $halaqat->map(fn (Halaqa $halaqa): array => [
            'id' => $halaqa->id,
            'name' => $halaqa->name,
            'color' => $halaqa->color,
            'is_active' => $halaqa->is_active,
            'teacher' => $halaqa->teacher?->name,
            'students_count' => $halaqa->students_count,
            'attendance_rate' => $this->reports->rate(
                (int) ($attendance->get($halaqa->id)->attended ?? 0),
                (int) ($attendance->get($halaqa->id)->absent ?? 0),
            ),
            'memorized' => (int) ($memorized[$halaqa->id] ?? 0),
            'sessions_completed' => (int) ($sessions->get($halaqa->id)->completed ?? 0),
            'sessions_cancelled' => (int) ($sessions->get($halaqa->id)->cancelled ?? 0),
        ]);

        return Inertia::render('reports/index', [
            'overview' => [
                'attendance_rate' => $this->reports->attendanceTotals($user->isAdmin() ? null : $halaqaIds, $from, now())['rate'],
                'memorized' => $rows->sum('memorized'),
                'sessions_completed' => $rows->sum('sessions_completed'),
                'sessions_cancelled' => $rows->sum('sessions_cancelled'),
            ],
            'halaqat' => $rows->values(),
        ]);
    }

    /**
     * Attendance matrix of a halaqa.
     */
    public function attendance(Request $request): Response|StreamedResponse
    {
        $user = $request->user();
        $halaqat = $user->accessibleHalaqat()->orderBy('name')->get(['id', 'name', 'color']);
        $halaqa = $halaqat->firstWhere('id', $request->integer('halaqa_id')) ?? $halaqat->first();
        [$from, $to] = $this->range($request, $user);

        $report = $halaqa ? $this->reports->attendance($halaqa, $from, $to) : null;

        if ($request->query('export') === 'csv' && $report !== null) {
            return $this->attendanceCsv($halaqa, $report, $user);
        }

        return Inertia::render('reports/attendance', [
            'halaqat' => $halaqat,
            'filters' => ['halaqa_id' => $halaqa?->id, 'from' => $from->toDateString(), 'to' => $to->toDateString()],
            'report' => $report,
        ]);
    }

    /**
     * Memorization and revision per student.
     */
    public function progress(Request $request): Response|StreamedResponse
    {
        $user = $request->user();
        $halaqat = $user->accessibleHalaqat()->orderBy('name')->get(['id', 'name', 'color']);
        $halaqa = $request->integer('halaqa_id') ? $halaqat->firstWhere('id', $request->integer('halaqa_id')) : null;
        [$from, $to] = $this->range($request, $user);

        $students = $halaqa
            ? $halaqa->students()->orderBy('name')->get()
            : User::query()
                ->students()
                ->when(! $user->isAdmin(), fn (Builder $query) => $query->whereHas(
                    'halaqat',
                    fn (Builder $query) => $query->whereIn('halaqat.id', $halaqat->pluck('id')),
                ))
                ->orderBy('name')
                ->get();

        $report = $this->reports->progress($students, $from, $to, $halaqa);

        if ($request->query('export') === 'csv') {
            return $this->progressCsv($report['rows'], $from, $to);
        }

        return Inertia::render('reports/progress', [
            'halaqat' => $halaqat,
            'filters' => ['halaqa_id' => $halaqa?->id, 'from' => $from->toDateString(), 'to' => $to->toDateString()],
            'report' => $report,
        ]);
    }

    /**
     * Printable report of one student.
     */
    public function student(Request $request, User $student): Response
    {
        $this->authorize('viewProgress', $student);

        [$from, $to] = $this->range($request, $request->user());
        $student->load('halaqat.teacher:id,name');

        $records = $student->progressRecords()
            ->with(['teacher', 'halaqa'])
            ->whereBetween('recorded_on', [$from->toDateString(), $to->toDateString()])
            ->orderBy('recorded_on')
            ->orderBy('id')
            ->get();

        $scores = $records->filter(fn (ProgressRecord $record): bool => $record->grade !== null)
            ->map(fn (ProgressRecord $record): int => $record->grade->score());

        return Inertia::render('reports/student', [
            'student' => [
                ...(new UserResource($student))->resolve(),
                'guardian_name' => $student->guardian_name,
                'halaqat' => $student->halaqat->map(fn (Halaqa $halaqa): array => [
                    'id' => $halaqa->id,
                    'name' => $halaqa->name,
                    'teacher' => $halaqa->teacher?->name,
                ])->values(),
            ],
            'summary' => $this->progress->summary($student),
            'attendance' => $this->progress->attendance($student, $from, $to),
            'records' => ProgressRecordResource::collection($records)->resolve(),
            'period' => [
                'memorized' => (int) $records->where('type', ProgressType::Memorization)->sum('ayahs_count'),
                'revised' => (int) $records->where('type', ProgressType::Revision)->sum('ayahs_count'),
                'records' => $records->count(),
                'mistakes' => (int) $records->sum('mistakes'),
                'average_grade' => $scores->isNotEmpty() ? Grade::fromScore($scores->avg())->value : null,
            ],
            'filters' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
        ]);
    }

    /**
     * Date range from the query string in the user's timezone (default: last 30 days).
     *
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    protected function range(Request $request, User $user): array
    {
        $timezone = $user->displayTimezone();
        $from = $this->parseDate($request->query('from'), $timezone) ?? CarbonImmutable::now($timezone)->subDays(29);
        $to = $this->parseDate($request->query('to'), $timezone) ?? CarbonImmutable::now($timezone);

        if ($from->greaterThan($to)) {
            [$from, $to] = [$to, $from];
        }

        return [$from->startOfDay(), $to->endOfDay()];
    }

    protected function parseDate(mixed $value, string $timezone): ?CarbonImmutable
    {
        if (! is_string($value) || preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) !== 1) {
            return null;
        }

        return CarbonImmutable::createFromFormat('Y-m-d', $value, $timezone) ?: null;
    }

    /**
     * @param  array{sessions: list<array<string, mixed>>, rows: list<array<string, mixed>>}  $report
     */
    protected function attendanceCsv(Halaqa $halaqa, array $report, User $user): StreamedResponse
    {
        $labels = collect(AttendanceStatus::cases())->mapWithKeys(fn (AttendanceStatus $status): array => [$status->value => $status->label()]);
        $timezone = $user->displayTimezone();

        $header = [
            __('Student'),
            ...array_map(
                fn (array $session): string => CarbonImmutable::parse($session['starts_at'])->setTimezone($timezone)->format('Y-m-d H:i'),
                $report['sessions'],
            ),
            __('Present'), __('Late'), __('Absent'), __('Excused'), __('Attendance rate'),
        ];

        $rows = array_map(fn (array $row): array => [
            $row['student']['name'],
            ...array_map(fn (?string $status): string => $status ? $labels[$status] : '-', $row['statuses']),
            $row['present'], $row['late'], $row['absent'], $row['excused'],
            $row['rate'] === null ? '-' : $row['rate'].'%',
        ], $report['rows']);

        return $this->csv('attendance-'.str($halaqa->name)->slug().'.csv', $header, $rows);
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    protected function progressCsv(array $rows, CarbonImmutable $from, CarbonImmutable $to): StreamedResponse
    {
        $header = [
            __('Student'), __('Memorized ayahs'), __('Revised ayahs'), __('Records'), __('Mistakes'),
            __('Average grade'), __('Attendance rate'), __('Total memorized'), __('Last record'),
        ];

        $data = array_map(fn (array $row): array => [
            $row['student']['name'],
            $row['memorized'],
            $row['revised'],
            $row['records_count'],
            $row['mistakes'],
            $row['average_grade'] ? Grade::from($row['average_grade'])->label() : '-',
            $row['attendance_rate'] === null ? '-' : $row['attendance_rate'].'%',
            $row['total_memorized'],
            $row['last_record_on'] ?? '-',
        ], $rows);

        return $this->csv("progress-{$from->toDateString()}-{$to->toDateString()}.csv", $header, $data);
    }

    /**
     * Stream a UTF-8 CSV that opens correctly in Excel (with Arabic text).
     *
     * @param  list<string>  $header
     * @param  iterable<array<int, mixed>>|Collection<int, array<int, mixed>>  $rows
     */
    protected function csv(string $filename, array $header, iterable $rows): StreamedResponse
    {
        return response()->streamDownload(function () use ($header, $rows): void {
            $output = fopen('php://output', 'w');

            fwrite($output, "\xEF\xBB\xBF");
            fputcsv($output, $header);

            foreach ($rows as $row) {
                fputcsv($output, $row);
            }

            fclose($output);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
