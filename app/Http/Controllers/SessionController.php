<?php

namespace App\Http\Controllers;

use App\Enums\AttendanceStatus;
use App\Enums\MeetingProvider;
use App\Enums\SessionSource;
use App\Enums\SessionStatus;
use App\Http\Requests\SessionRequest;
use App\Http\Resources\ProgressRecordResource;
use App\Http\Resources\RecitationSubmissionResource;
use App\Http\Resources\SessionResource;
use App\Models\Halaqa;
use App\Models\HalaqaSession;
use App\Models\User;
use App\Notifications\SessionScheduled;
use App\Services\Meetings\MeetingManager;
use App\Services\Notifier;
use App\Services\SessionLifecycle;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SessionController extends Controller
{
    public function __construct(
        protected MeetingManager $meetings,
        protected SessionLifecycle $lifecycle,
        protected Notifier $notifier,
    ) {}

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();
        $timezone = $user->displayTimezone();

        $view = in_array($request->query('view'), ['upcoming', 'past', 'all'], true) ? $request->query('view') : 'upcoming';
        $halaqaId = $request->integer('halaqa_id') ?: null;
        $status = SessionStatus::tryFrom((string) $request->query('status'));
        $from = $request->date('from', 'Y-m-d', $timezone);
        $to = $request->date('to', 'Y-m-d', $timezone);
        $now = now()->toDateTimeString();

        $sessions = HalaqaSession::query()
            ->visibleTo($user)
            ->with(['halaqa', 'teacher'])
            ->when($user->isStudent(), fn (Builder $query) => $query->with([
                'attendances' => fn ($query) => $query->where('student_id', $user->id),
            ]))
            ->withCount(['attendances as present_count' => fn (Builder $query) => $query->whereIn('status', [AttendanceStatus::Present, AttendanceStatus::Late])])
            ->when($halaqaId, fn (Builder $query, int $id) => $query->where('halaqa_id', $id))
            ->when($status, fn (Builder $query, SessionStatus $status) => $query->where('status', $status))
            ->when($from, fn (Builder $query, $date) => $query->where('starts_at', '>=', $date->copy()->startOfDay()->utc()))
            ->when($to, fn (Builder $query, $date) => $query->where('starts_at', '<=', $date->copy()->endOfDay()->utc()))
            ->when($view === 'upcoming', fn (Builder $query) => $query
                ->where(fn (Builder $query) => $query
                    ->where('status', SessionStatus::Live)
                    ->orWhereRaw(HalaqaSession::endSql().' >= ?', [$now]))
                ->orderBy('starts_at'))
            ->when($view === 'past', fn (Builder $query) => $query
                ->where('status', '!=', SessionStatus::Live)
                ->whereRaw(HalaqaSession::endSql().' < ?', [$now])
                ->orderByDesc('starts_at'))
            ->when($view === 'all', fn (Builder $query) => $query->orderByDesc('starts_at'))
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('sessions/index', [
            'sessions' => $this->paginated($sessions, SessionResource::class),
            'filters' => [
                'view' => $view,
                'halaqa_id' => $halaqaId,
                'status' => $status?->value,
                'from' => $from?->toDateString(),
                'to' => $to?->toDateString(),
            ],
            'halaqat' => $user->accessibleHalaqat()->orderBy('name')->get(['id', 'name', 'color']),
            'can' => ['create' => $user->can('create', HalaqaSession::class)],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request): Response
    {
        $this->authorize('create', HalaqaSession::class);

        $user = $request->user();
        $start = now($user->displayTimezone())->addHour()->startOfHour();

        return Inertia::render('sessions/form', [
            'session' => null,
            'halaqat' => $this->manageableHalaqat($user),
            'providers' => $this->meetings->providers(),
            'defaults' => [
                'halaqa_id' => $request->integer('halaqa_id') ?: null,
                'date' => $start->format('Y-m-d'),
                'time' => $start->format('H:i'),
            ],
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(SessionRequest $request): RedirectResponse
    {
        $user = $request->user();
        $halaqa = Halaqa::query()->findOrFail($request->integer('halaqa_id'));

        $this->authorize('manage', $halaqa);

        $provider = MeetingProvider::tryFrom((string) $request->input('meeting_provider')) ?? $halaqa->meeting_provider;

        $session = $halaqa->sessions()->create([
            'teacher_id' => $halaqa->teacher_id ?? ($user->isTeacher() ? $user->id : null),
            'title' => $request->input('title'),
            'starts_at' => $request->startsAt(),
            'duration_minutes' => $request->integer('duration_minutes'),
            'status' => SessionStatus::Scheduled,
            'source' => SessionSource::Manual,
            'meeting_provider' => $provider,
            'meeting_url' => $provider === MeetingProvider::Manual ? ($request->input('meeting_url') ?: $halaqa->meeting_url) : null,
            'created_by' => $user->id,
        ]);

        $session->setRelation('halaqa', $halaqa);
        $ready = $this->meetings->tryEnsure($session);

        if ($request->boolean('notify', true) && $session->starts_at->isFuture()) {
            $this->notifier->send($halaqa->students()->active()->get(), new SessionScheduled($session));
        }

        $ready
            ? $this->toast(__('Session scheduled.'))
            : $this->toast(__('Session scheduled, but the meeting link could not be created yet. It will be retried when the session starts.'), 'warning');

        return redirect()->route('sessions.show', $session);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, HalaqaSession $session): Response
    {
        $this->authorize('view', $session);

        $user = $request->user();
        $session->load(['halaqa.teacher', 'teacher', 'creator']);
        $canManage = $session->isManagedBy($user);
        $canJoin = $session->isJoinableBy($user);

        $attendances = $session->attendances()->get()->keyBy('student_id');
        $students = collect();

        if ($canManage) {
            $students = $session->halaqa->students()->orderBy('name')->get();
            $former = $attendances->keys()->diff($students->pluck('id'));

            if ($former->isNotEmpty()) {
                $students = $students->merge(User::query()->whereIn('id', $former)->get());
            }
        }

        $records = $session->progressRecords()
            ->with(['student', 'teacher', 'halaqa', 'groupRecords'])
            ->when(! $canManage, fn (Builder $query) => $query->where('student_id', $user->id))
            ->latest('id')
            ->get();

        $recordingUrl = $session->recording_url
            ?: ($session->recording_path ? Storage::disk(config('meetings.recordings_disk'))->url($session->recording_path) : null);

        $myAttendance = $user->isStudent() ? $attendances->get($user->id) : null;

        return Inertia::render('sessions/show', [
            'session' => [
                ...(new SessionResource($session))->resolve(),
                'notes' => $session->notes,
                'recording_url' => $recordingUrl,
                'recording_passcode' => $session->meeting_data['recording_passcode'] ?? null,
                'started_at' => $session->started_at?->toIso8601String(),
                'ended_at' => $session->ended_at?->toIso8601String(),
                'meeting_url' => $canManage ? $session->meeting_url : null,
                'meeting_password' => $canManage || $canJoin ? $session->meeting_password : null,
                'meeting_configured' => $this->meetings->driver($session->meeting_provider)->isConfigured(),
                'embedded' => $this->meetings->isEmbedded($session->meeting_provider),
                'join_opens_at' => $session->starts_at->copy()->subMinutes(config('meetings.student_join_before_minutes'))->toIso8601String(),
                'created_by' => $session->creator?->name,
            ],
            'attendance' => $canManage ? $students->map(function (User $student) use ($attendances): array {
                $attendance = $attendances->get($student->id);

                return [
                    'student' => ['id' => $student->id, 'name' => $student->name, 'avatar_url' => $student->avatar_url],
                    'status' => $attendance?->status->value,
                    'joined_at' => $attendance?->joined_at?->toIso8601String(),
                    'notes' => $attendance?->notes,
                ];
            })->values() : null,
            'myAttendance' => $myAttendance ? [
                'status' => $myAttendance->status->value,
                'joined_at' => $myAttendance->joined_at?->toIso8601String(),
            ] : null,
            'records' => ProgressRecordResource::collection($records)->resolve(),
            'students' => $canManage ? $students->map(fn (User $student): array => ['id' => $student->id, 'name' => $student->name])->values() : [],
            'submissions' => $canManage
                ? RecitationSubmissionResource::collection(
                    $session->halaqa->recitationSubmissions()->with('student')->oldest('updated_at')->get(),
                )->resolve()
                : [],
            'can' => [
                'manage' => $canManage,
                'join' => $canJoin,
                'edit' => $canManage && $session->status === SessionStatus::Scheduled,
                'cancel' => $canManage && $session->status->isOpen(),
                'end' => $canManage && $session->status === SessionStatus::Live,
                'delete' => $canManage,
            ],
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Request $request, HalaqaSession $session): Response
    {
        $this->authorize('update', $session);

        $local = $session->starts_at->copy()->setTimezone($request->user()->displayTimezone());
        $session->load('halaqa');

        return Inertia::render('sessions/form', [
            'session' => [
                'id' => $session->id,
                'halaqa_id' => $session->halaqa_id,
                'halaqa' => ['id' => $session->halaqa->id, 'name' => $session->halaqa->name, 'color' => $session->halaqa->color],
                'title' => $session->title,
                'date' => $local->format('Y-m-d'),
                'time' => $local->format('H:i'),
                'duration_minutes' => $session->duration_minutes,
                'meeting_provider' => $session->meeting_provider->value,
                'meeting_url' => $session->meeting_provider === MeetingProvider::Manual ? $session->meeting_url : null,
                'status' => $session->status->value,
            ],
            'halaqat' => [],
            'providers' => $this->meetings->providers(),
            'defaults' => null,
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(SessionRequest $request, HalaqaSession $session): RedirectResponse
    {
        $this->authorize('update', $session);

        if ($session->status !== SessionStatus::Scheduled) {
            $this->toast(__('Only scheduled sessions can be edited.'), 'error');

            return redirect()->route('sessions.show', $session);
        }

        $provider = MeetingProvider::tryFrom((string) $request->input('meeting_provider')) ?? $session->meeting_provider;
        $providerChanged = $provider !== $session->meeting_provider;
        $startsAt = $request->startsAt();
        $timeChanged = ! $session->starts_at->equalTo($startsAt) || $session->duration_minutes !== $request->integer('duration_minutes');

        if ($providerChanged) {
            $this->meetings->release($session);
            $session->fill(['meeting_id' => null, 'meeting_url' => null, 'meeting_password' => null, 'meeting_data' => null]);
        }

        $session->fill([
            'title' => $request->input('title'),
            'starts_at' => $startsAt,
            'duration_minutes' => $request->integer('duration_minutes'),
            'meeting_provider' => $provider,
        ]);

        if ($timeChanged) {
            $session->reminder_sent_at = null;
        }

        if ($provider === MeetingProvider::Manual) {
            $session->meeting_url = $request->input('meeting_url') ?: $session->halaqa->meeting_url;
        }

        $session->save();

        if ($providerChanged) {
            $this->meetings->tryEnsure($session);
        } elseif ($timeChanged) {
            $this->meetings->sync($session);
        }

        if ($timeChanged && $request->boolean('notify', true) && $session->starts_at->isFuture()) {
            $this->notifier->send($session->halaqa->students()->active()->get(), new SessionScheduled($session, rescheduled: true));
        }

        $this->toast(__('Session updated.'));

        return redirect()->route('sessions.show', $session);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(HalaqaSession $session): RedirectResponse
    {
        $this->authorize('delete', $session);

        $this->meetings->release($session);
        $session->delete();

        $this->toast(__('Session deleted.'));

        return redirect()->route('sessions.index');
    }

    /**
     * Cancel the session and notify the students.
     */
    public function cancel(Request $request, HalaqaSession $session): RedirectResponse
    {
        $this->authorize('update', $session);

        $validated = $request->validate(['reason' => ['nullable', 'string', 'max:255']]);

        if (! $session->status->isOpen()) {
            $this->toast(__('This session can no longer be cancelled.'), 'error');

            return back();
        }

        $this->lifecycle->cancel($session, $validated['reason'] ?? null, $request->user());

        $this->toast(__('Session cancelled and students notified.'));

        return back();
    }

    /**
     * Save the lesson summary and the recording link.
     */
    public function notes(Request $request, HalaqaSession $session): RedirectResponse
    {
        $this->authorize('update', $session);

        $session->update($request->validate([
            'notes' => ['nullable', 'string', 'max:5000'],
            'recording_url' => ['nullable', 'url', 'max:1000'],
        ]));

        $this->toast(__('Saved.'));

        return back();
    }

    /**
     * Halaqat the user can schedule sessions for.
     *
     * @return list<array<string, mixed>>
     */
    protected function manageableHalaqat(User $user): array
    {
        return Halaqa::query()
            ->when($user->isTeacher(), fn (Builder $query) => $query->where('teacher_id', $user->id))
            ->active()
            ->orderBy('name')
            ->get()
            ->map(fn (Halaqa $halaqa): array => [
                'id' => $halaqa->id,
                'name' => $halaqa->name,
                'color' => $halaqa->color,
                'duration_minutes' => $halaqa->duration_minutes,
                'meeting_provider' => $halaqa->meeting_provider->value,
                'meeting_url' => $halaqa->meeting_url,
            ])
            ->all();
    }
}
