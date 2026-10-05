<?php

namespace App\Http\Controllers;

use App\Enums\AttendanceStatus;
use App\Enums\HalaqaGender;
use App\Enums\ProgressType;
use App\Enums\SessionSource;
use App\Enums\SessionStatus;
use App\Http\Requests\HalaqaRequest;
use App\Http\Resources\HalaqaAnnouncementResource;
use App\Http\Resources\HalaqaResource;
use App\Http\Resources\ProgressRecordResource;
use App\Http\Resources\RecitationSubmissionResource;
use App\Http\Resources\SessionResource;
use App\Http\Resources\VideoResource;
use App\Models\Academy;
use App\Models\Halaqa;
use App\Models\HalaqaSession;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\AddedToHalaqa;
use App\Services\Meetings\MeetingManager;
use App\Services\Notifier;
use App\Services\Reports;
use App\Services\SessionScheduler;
use App\Services\StudentProgress;
use DateTimeZone;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class HalaqaController extends Controller
{
    public function __construct(
        protected SessionScheduler $scheduler,
        protected MeetingManager $meetings,
        protected Notifier $notifier,
        protected Reports $reports,
        protected StudentProgress $progress,
    ) {}

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $search = trim((string) $request->query('search'));
        $status = in_array($request->query('status'), ['active', 'archived', 'all'], true) ? $request->query('status') : 'active';
        $teacherId = $request->integer('teacher_id') ?: null;
        $academyId = $user->isAdmin() ? ($request->integer('academy_id') ?: null) : null;

        $halaqat = Halaqa::query()
            ->visibleTo($user)
            ->when($academyId, fn (Builder $query, int $id) => $query->where('academy_id', $id))
            ->when($search !== '', fn (Builder $query) => $query->where('name', 'like', "%{$search}%"))
            ->when($status === 'active', fn (Builder $query) => $query->where('is_active', true))
            ->when($status === 'archived', fn (Builder $query) => $query->where('is_active', false))
            ->when($teacherId, fn (Builder $query, int $id) => $query->where('teacher_id', $id))
            ->with(['academy', 'teacher', 'sessions' => fn ($query) => $query->upcoming()->orderBy('starts_at')->limit(1)])
            ->withCount('students')
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('halaqat/index', [
            'halaqat' => $this->paginated($halaqat, HalaqaResource::class),
            'filters' => ['search' => $search, 'status' => $status, 'teacher_id' => $teacherId, 'academy_id' => $academyId],
            'teachers' => $user->managesAcademies()
                ? User::query()->teachers()->inAcademy($user->isManager() ? $user->academy_id : $academyId)->orderBy('name')->get(['id', 'name'])
                : [],
            'academies' => $user->isAdmin() ? Academy::query()->orderBy('name')->get(['id', 'name']) : [],
            'can' => ['create' => $user->can('create', Halaqa::class)],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): Response
    {
        $this->authorize('create', Halaqa::class);

        return Inertia::render('halaqat/form', [
            'halaqa' => null,
            ...$this->formOptions(request()->user()),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(HalaqaRequest $request): RedirectResponse
    {
        $halaqa = Halaqa::query()->create([
            ...$request->safe()->except(['student_ids', 'academy_id']),
            'academy_id' => $request->academyId(),
        ]);

        $this->syncStudents($halaqa, $request->input('student_ids', []));
        $created = $this->scheduler->generate($halaqa);

        $this->toast(__('Halaqa created. :count upcoming sessions were scheduled.', ['count' => $created]));

        return redirect()->route('halaqat.show', $halaqa);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Halaqa $halaqa): Response
    {
        $this->authorize('view', $halaqa);

        $user = $request->user();
        $canManage = $user->can('manage', $halaqa);

        $halaqa->load('teacher')->loadCount('students');
        $students = $halaqa->students()->orderBy('name')->get();
        $monthAgo = now()->subDays(29)->startOfDay();

        $presentCount = ['attendances as present_count' => fn (Builder $query) => $query->whereIn('status', [AttendanceStatus::Present, AttendanceStatus::Late])];

        return Inertia::render('halaqat/show', [
            'halaqa' => [
                ...(new HalaqaResource($halaqa))->resolve(),
                'meeting_url' => $canManage ? $halaqa->meeting_url : null,
            ],
            'students' => $canManage
                ? $this->reports->progress($students, now()->subDays(59)->startOfDay(), now(), $halaqa)['rows']
                : $students->map(fn (User $student): array => [
                    'student' => ['id' => $student->id, 'name' => $student->name, 'avatar_url' => $student->avatar_url],
                ])->all(),
            'upcomingSessions' => SessionResource::collection(
                $halaqa->sessions()->upcoming()->with(['halaqa', 'teacher'])->orderBy('starts_at')->limit(5)->get(),
            )->resolve(),
            'recentSessions' => SessionResource::collection(
                $halaqa->sessions()
                    ->where('starts_at', '<', now())
                    ->where('status', '!=', SessionStatus::Scheduled)
                    ->with(['halaqa', 'teacher'])
                    ->withCount($presentCount)
                    ->withCount('attendances')
                    ->latest('starts_at')
                    ->limit(6)
                    ->get(),
            )->resolve(),
            'recentRecords' => ProgressRecordResource::collection(
                $halaqa->progressRecords()
                    ->when(! $canManage, fn (Builder $query) => $query->where('student_id', $user->id))
                    ->with(['student', 'teacher', 'halaqa', 'groupRecords'])
                    ->latest('recorded_on')
                    ->latest('id')
                    ->limit(8)
                    ->get(),
            )->resolve(),
            'videos' => VideoResource::collection(
                $halaqa->videos()
                    ->when($user->isStudent(), fn (Builder $query) => $query->where('is_published', true))
                    ->with(['halaqa', 'creator'])
                    ->latest()
                    ->limit(6)
                    ->get(),
            )->resolve(),
            'stats' => [
                'attendance_rate' => $this->reports->attendanceTotals([$halaqa->id], $monthAgo, now())['rate'],
                'memorized_month' => (int) $halaqa->progressRecords()
                    ->where('type', ProgressType::Memorization)
                    ->where('recorded_on', '>=', $monthAgo->toDateString())
                    ->sum('ayahs_count'),
                'sessions_month' => $halaqa->sessions()
                    ->where('status', SessionStatus::Completed)
                    ->where('starts_at', '>=', $monthAgo)
                    ->count(),
            ],
            'availableStudents' => $user->managesAcademy($halaqa->academy_id) ? $this->availableStudents($halaqa) : [],
            'submissions' => RecitationSubmissionResource::collection(
                $halaqa->recitationSubmissions()
                    ->when(! $canManage, fn (Builder $query) => $query->where('student_id', $user->id))
                    ->with('student')
                    ->oldest('updated_at')
                    ->get(),
            )->resolve(),
            'lastPosition' => $user->isStudent() ? $this->progress->lastMemorizedPosition($user) : null,
            'announcements' => HalaqaAnnouncementResource::collection(
                $halaqa->announcements()
                    ->when(! $canManage, fn (Builder $query) => $query->sent())
                    ->with(['author', 'sessions', 'halaqa'])
                    ->orderByRaw('sent_at IS NULL DESC')
                    ->orderByDesc('sent_at')
                    ->latest('id')
                    ->limit(50)
                    ->get(),
            )->resolve(),
            'announcementSessions' => $canManage
                ? $halaqa->sessions()
                    ->upcoming()
                    ->orderBy('starts_at')
                    ->limit(30)
                    ->get()
                    ->map(fn (HalaqaSession $session): array => [
                        'id' => $session->id,
                        'title' => $session->displayTitle(),
                        'starts_at' => $session->starts_at->toIso8601String(),
                        'status' => $session->status->value,
                        'extra' => $session->source === SessionSource::Manual,
                    ])
                    ->values()
                : [],
            'focus' => [
                'tab' => in_array($request->query('tab'), ['students', 'sessions', 'records', 'messages', 'videos'], true) ? $request->query('tab') : null,
                'submission' => $request->integer('submission') ?: null,
            ],
            'can' => [
                'manage' => $canManage,
                'update' => $user->can('update', $halaqa),
                'delete' => $user->can('delete', $halaqa),
                'submit' => $user->can('submitRecitation', $halaqa),
            ],
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Halaqa $halaqa): Response
    {
        $this->authorize('update', $halaqa);

        return Inertia::render('halaqat/form', [
            'halaqa' => [
                ...(new HalaqaResource($halaqa))->resolve(),
                'teacher_id' => $halaqa->teacher_id,
                'meeting_url' => $halaqa->meeting_url,
                'student_ids' => $halaqa->students()->pluck('users.id'),
            ],
            ...$this->formOptions(request()->user(), $halaqa),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(HalaqaRequest $request, Halaqa $halaqa): RedirectResponse
    {
        $halaqa->fill($request->safe()->except(['student_ids', 'academy_id']));

        $scheduleChanged = $halaqa->isDirty(['schedule', 'duration_minutes', 'timezone', 'meeting_provider', 'starts_on', 'is_active']);
        $teacherChanged = $halaqa->isDirty('teacher_id');

        $halaqa->save();

        $this->syncStudents($halaqa, $request->input('student_ids', []));

        if ($teacherChanged) {
            $halaqa->sessions()
                ->where('status', SessionStatus::Scheduled)
                ->where('starts_at', '>', now())
                ->update(['teacher_id' => $halaqa->teacher_id]);
        }

        if ($scheduleChanged) {
            $this->scheduler->regenerate($halaqa);
        }

        $this->toast(__('Halaqa updated.'));

        return redirect()->route('halaqat.show', $halaqa);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Halaqa $halaqa): RedirectResponse
    {
        $this->authorize('delete', $halaqa);

        $halaqa->sessions()
            ->where('status', SessionStatus::Scheduled)
            ->where('starts_at', '>', now())
            ->get()
            ->each(fn (HalaqaSession $session) => $this->meetings->release($session));

        Storage::disk('public')->deleteDirectory("chat/{$halaqa->id}");

        $halaqa->delete();

        $this->toast(__('Halaqa deleted.'));

        return redirect()->route('halaqat.index');
    }

    /**
     * Create the missing sessions from the weekly schedule.
     */
    public function generateSessions(Halaqa $halaqa): RedirectResponse
    {
        $this->authorize('manage', $halaqa);

        $count = $this->scheduler->generate($halaqa);

        $this->toast($count > 0
            ? __(':count sessions were scheduled.', ['count' => $count])
            : __('All upcoming sessions are already scheduled.'));

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    protected function formOptions(User $user, ?Halaqa $halaqa = null): array
    {
        // A manager sees their academy; the administration every academy, the form keeps the chosen one.
        $academyId = $halaqa?->academy_id ?? ($user->isManager() ? $user->academy_id : null);

        return [
            'academies' => $user->isAdmin() && $halaqa === null ? Academy::query()->active()->orderBy('name')->get(['id', 'name']) : [],
            'academyId' => $academyId ?? (request()->integer('academy_id') ?: null),
            'teachers' => User::query()->teachers()->active()->inAcademy($academyId)->orderBy('name')->get(['id', 'name', 'gender', 'academy_id'])
                ->map(fn (User $teacher): array => ['id' => $teacher->id, 'name' => $teacher->name, 'gender' => $teacher->gender?->value, 'academy_id' => $teacher->academy_id]),
            'students' => User::query()->students()->active()->inAcademy($academyId)->whereNotNull('academy_id')->withCount('halaqat')->orderBy('name')->get()
                ->map(fn (User $student): array => [
                    'id' => $student->id,
                    'name' => $student->name,
                    'gender' => $student->gender?->value,
                    'avatar_url' => $student->avatar_url,
                    'halaqat_count' => $student->halaqat_count,
                    'academy_id' => $student->academy_id,
                ]),
            'providers' => $this->meetings->providers(),
            'timezones' => DateTimeZone::listIdentifiers(),
            'defaults' => [
                'timezone' => Setting::get('default_timezone'),
                'meeting_provider' => $this->meetings->defaultProvider()->value,
                'duration_minutes' => 60,
                'color' => 'emerald',
                'gender' => HalaqaGender::Mixed->value,
            ],
        ];
    }

    /**
     * Active students who can still join the halaqa.
     *
     * @return list<array<string, mixed>>
     */
    protected function availableStudents(Halaqa $halaqa): array
    {
        return User::query()
            ->students()
            ->active()
            ->where('academy_id', $halaqa->academy_id)
            ->whereNotIn('id', $halaqa->students()->select('users.id'))
            ->when($halaqa->gender !== HalaqaGender::Mixed, fn (Builder $query) => $query->where(
                fn (Builder $query) => $query->whereNull('gender')->orWhere('gender', $halaqa->gender->value),
            ))
            ->orderBy('name')
            ->get()
            ->map(fn (User $student): array => [
                'id' => $student->id,
                'name' => $student->name,
                'avatar_url' => $student->avatar_url,
                'gender' => $student->gender?->value,
            ])
            ->all();
    }

    /**
     * @param  array<int, int|string>  $studentIds
     */
    protected function syncStudents(Halaqa $halaqa, array $studentIds): void
    {
        $changes = $halaqa->students()->sync(array_map('intval', $studentIds));

        if ($changes['attached'] !== []) {
            $halaqa->loadMissing('teacher');
            $this->notifier->send(User::query()->whereIn('id', $changes['attached'])->get(), new AddedToHalaqa($halaqa));
        }
    }
}
