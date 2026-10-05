<?php

namespace App\Http\Controllers;

use App\Enums\AttendanceStatus;
use App\Enums\ProgressType;
use App\Enums\SessionStatus;
use App\Enums\UserRole;
use App\Http\Resources\HalaqaAnnouncementResource;
use App\Http\Resources\HalaqaResource;
use App\Http\Resources\ProgressRecordResource;
use App\Http\Resources\RecitationSubmissionResource;
use App\Http\Resources\SessionResource;
use App\Http\Resources\VideoResource;
use App\Models\Attendance;
use App\Models\Halaqa;
use App\Models\HalaqaAnnouncement;
use App\Models\HalaqaSession;
use App\Models\ProgressRecord;
use App\Models\RecitationSubmission;
use App\Models\User;
use App\Models\Video;
use App\Services\Reports;
use App\Services\StudentProgress;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        protected Reports $reports,
        protected StudentProgress $progress,
    ) {}

    /**
     * Show the dashboard of the signed-in user's role.
     */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        return match ($user->role) {
            UserRole::Admin => $this->admin($user),
            UserRole::Teacher => $this->teacher($user),
            UserRole::Student => $this->student($user),
        };
    }

    protected function admin(User $user): Response
    {
        $timezone = $user->displayTimezone();
        $trendFrom = now()->subWeeks(8)->addDay()->startOfDay();

        $todaySessions = HalaqaSession::query()
            ->with(['halaqa', 'teacher'])
            ->withCount(['attendances as present_count' => fn (Builder $query) => $query->whereIn('status', [AttendanceStatus::Present, AttendanceStatus::Late])])
            ->whereBetween('starts_at', [now($timezone)->startOfDay()->utc(), now($timezone)->endOfDay()->utc()])
            ->orderBy('starts_at')
            ->get();

        return Inertia::render('dashboard/admin', [
            'stats' => [
                'students' => User::query()->students()->active()->count(),
                'teachers' => User::query()->teachers()->active()->count(),
                'halaqat' => Halaqa::query()->active()->count(),
                'sessions_week' => $this->sessionsThisWeek(HalaqaSession::query()),
                'attendance_rate' => $this->reports->attendanceTotals(null, now()->subDays(29)->startOfDay(), now())['rate'],
                'memorized_month' => (int) ProgressRecord::query()
                    ->where('type', ProgressType::Memorization)
                    ->whereDate('recorded_on', '>=', now()->startOfMonth())
                    ->sum('ayahs_count'),
            ],
            'attendanceTrend' => $this->reports->weeklyAttendance(null, $trendFrom, now()),
            'memorizationTrend' => $this->reports->weeklyMemorization(null, $trendFrom, now()),
            'todaySessions' => SessionResource::collection($todaySessions)->resolve(),
            'recentRecords' => ProgressRecordResource::collection(
                ProgressRecord::query()->with(['student', 'teacher', 'halaqa', 'groupRecords'])->latest('id')->limit(6)->get(),
            )->resolve(),
            'topStudents' => $this->topStudents(null),
            'pendingSubmissions' => $this->pendingSubmissions(null),
        ]);
    }

    protected function teacher(User $user): Response
    {
        $halaqaIds = $user->teachingHalaqat()->pluck('id')->all();
        $trendFrom = now()->subWeeks(8)->addDay()->startOfDay();

        $halaqat = $user->teachingHalaqat()
            ->active()
            ->with(['teacher', 'sessions' => fn ($query) => $query->upcoming()->orderBy('starts_at')->limit(1)])
            ->withCount('students')
            ->orderBy('name')
            ->get();

        $pendingAttendance = HalaqaSession::query()
            ->visibleTo($user)
            ->with(['halaqa', 'teacher'])
            ->where('status', SessionStatus::Completed)
            ->where('starts_at', '>=', now()->subDays(14))
            ->whereDoesntHave('attendances')
            ->latest('starts_at')
            ->limit(5)
            ->get();

        return Inertia::render('dashboard/teacher', [
            'stats' => [
                'halaqat' => $halaqat->count(),
                'students' => DB::table('halaqa_student')->whereIn('halaqa_id', $halaqaIds)->distinct()->count('student_id'),
                'sessions_week' => $this->sessionsThisWeek(HalaqaSession::query()->visibleTo($user)),
                'attendance_rate' => $this->reports->attendanceTotals($halaqaIds, now()->subDays(29)->startOfDay(), now())['rate'],
                'records_month' => ProgressRecord::query()
                    ->whereIn('halaqa_id', $halaqaIds)
                    ->whereDate('recorded_on', '>=', now()->startOfMonth())
                    ->count(),
            ],
            'upcomingSessions' => SessionResource::collection(
                HalaqaSession::query()->visibleTo($user)->upcoming()->with(['halaqa', 'teacher'])->orderBy('starts_at')->limit(6)->get(),
            )->resolve(),
            'pendingAttendance' => SessionResource::collection($pendingAttendance)->resolve(),
            'halaqat' => HalaqaResource::collection($halaqat)->resolve(),
            'recentRecords' => ProgressRecordResource::collection(
                ProgressRecord::query()->with(['student', 'teacher', 'halaqa', 'groupRecords'])->whereIn('halaqa_id', $halaqaIds)->latest('id')->limit(6)->get(),
            )->resolve(),
            'attentionStudents' => $this->attentionStudents($halaqaIds),
            'memorizationTrend' => $this->reports->weeklyMemorization(null, $trendFrom, now(), $halaqaIds),
            'topStudents' => $this->topStudents($halaqaIds),
            'pendingSubmissions' => $this->pendingSubmissions($halaqaIds),
        ]);
    }

    protected function student(User $user): Response
    {
        $sessions = HalaqaSession::query()
            ->visibleTo($user)
            ->upcoming()
            ->with(['halaqa', 'teacher'])
            ->orderBy('starts_at')
            ->limit(5)
            ->get();

        $nextSession = $sessions->first();

        return Inertia::render('dashboard/student', [
            'nextSession' => $nextSession ? (new SessionResource($nextSession))->resolve() : null,
            'upcomingSessions' => SessionResource::collection($sessions->slice(1)->values())->resolve(),
            'summary' => $this->progress->summary($user),
            'recentRecords' => ProgressRecordResource::collection(
                $user->progressRecords()->with(['teacher', 'halaqa', 'groupRecords'])->latest('recorded_on')->latest('id')->limit(5)->get(),
            )->resolve(),
            'halaqat' => HalaqaResource::collection($user->halaqat()->with('teacher')->withCount('students')->get())->resolve(),
            'videos' => VideoResource::collection(Video::query()->visibleTo($user)->with('halaqa')->latest()->limit(4)->get())->resolve(),
            'announcements' => HalaqaAnnouncementResource::collection(
                HalaqaAnnouncement::query()
                    ->sent()
                    ->whereIn('halaqa_id', $user->enrolledHalaqaIds())
                    ->with(['author', 'halaqa'])
                    ->latest('sent_at')
                    ->limit(3)
                    ->get(),
            )->resolve(),
            'mySubmissions' => RecitationSubmissionResource::collection(
                $user->recitationSubmissions()->with('halaqa')->latest('updated_at')->get(),
            )->resolve(),
            'mushafPage' => $user->mushaf_page,
        ]);
    }

    /**
     * Recitations entered by students and waiting for grading.
     *
     * @param  list<int>|null  $halaqaIds
     * @return list<array<string, mixed>>
     */
    protected function pendingSubmissions(?array $halaqaIds): array
    {
        return RecitationSubmissionResource::collection(
            RecitationSubmission::query()
                ->when($halaqaIds !== null, fn (Builder $query) => $query->whereIn('halaqa_id', $halaqaIds))
                ->with(['student', 'halaqa'])
                ->oldest('updated_at')
                ->limit(8)
                ->get(),
        )->resolve();
    }

    /**
     * @param  Builder<HalaqaSession>  $query
     */
    protected function sessionsThisWeek(Builder $query): int
    {
        return $query
            ->where('status', '!=', SessionStatus::Cancelled)
            ->whereBetween('starts_at', [now()->startOfDay(), now()->addDays(7)->endOfDay()])
            ->count();
    }

    /**
     * Students who memorized the most this month.
     *
     * @param  list<int>|null  $halaqaIds
     * @return list<array<string, mixed>>
     */
    protected function topStudents(?array $halaqaIds): array
    {
        $rows = ProgressRecord::query()
            ->where('type', ProgressType::Memorization)
            ->whereDate('recorded_on', '>=', now()->startOfMonth())
            ->when($halaqaIds !== null, fn (Builder $query) => $query->whereIn('halaqa_id', $halaqaIds))
            ->groupBy('student_id')
            ->selectRaw('student_id, SUM(ayahs_count) as ayahs')
            ->orderByDesc('ayahs')
            ->limit(5)
            ->toBase()
            ->get();

        $students = User::query()->whereIn('id', $rows->pluck('student_id'))->get()->keyBy('id');

        return $rows
            ->filter(fn ($row): bool => $students->has($row->student_id))
            ->map(fn ($row): array => [
                'id' => $students[$row->student_id]->id,
                'name' => $students[$row->student_id]->name,
                'avatar_url' => $students[$row->student_id]->avatar_url,
                'ayahs' => (int) $row->ayahs,
                'total' => $students[$row->student_id]->memorized_ayahs,
            ])
            ->values()
            ->all();
    }

    /**
     * Students with repeated absences in the last two weeks.
     *
     * @param  list<int>  $halaqaIds
     * @return list<array<string, mixed>>
     */
    protected function attentionStudents(array $halaqaIds): array
    {
        $rows = Attendance::query()
            ->join('halaqa_sessions', 'halaqa_sessions.id', '=', 'attendances.halaqa_session_id')
            ->whereIn('halaqa_sessions.halaqa_id', $halaqaIds)
            ->where('halaqa_sessions.starts_at', '>=', now()->subDays(14))
            ->where('attendances.status', AttendanceStatus::Absent->value)
            ->groupBy('attendances.student_id')
            ->havingRaw('COUNT(*) >= 2')
            ->selectRaw('attendances.student_id as student_id, COUNT(*) as absences')
            ->orderByDesc('absences')
            ->limit(5)
            ->toBase()
            ->get();

        $students = User::query()->whereIn('id', $rows->pluck('student_id'))->get()->keyBy('id');

        return $rows
            ->filter(fn ($row): bool => $students->has($row->student_id))
            ->map(fn ($row): array => [
                'id' => $students[$row->student_id]->id,
                'name' => $students[$row->student_id]->name,
                'avatar_url' => $students[$row->student_id]->avatar_url,
                'absences' => (int) $row->absences,
            ])
            ->values()
            ->all();
    }
}
