<?php

namespace App\Http\Controllers;

use App\Enums\SessionStatus;
use App\Enums\UserRole;
use App\Http\Requests\UserRequest;
use App\Http\Resources\HalaqaResource;
use App\Http\Resources\ProgressRecordResource;
use App\Http\Resources\SessionResource;
use App\Http\Resources\UserResource;
use App\Models\Academy;
use App\Models\Halaqa;
use App\Models\HalaqaSession;
use App\Models\ProgressRecord;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\AccountCreated;
use App\Notifications\AddedToHalaqa;
use App\Services\Notifier;
use App\Services\StudentProgress;
use DateTimeZone;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class UserController extends Controller
{
    public function __construct(
        protected StudentProgress $progress,
        protected Notifier $notifier,
    ) {}

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', User::class);

        $viewer = $request->user();
        $role = UserRole::tryFrom((string) $request->query('role'));
        $status = in_array($request->query('status'), ['active', 'inactive'], true) ? $request->query('status') : null;
        $search = trim((string) $request->query('search'));
        $academyId = $viewer->isAdmin() ? ($request->integer('academy_id') ?: null) : null;

        // A manager sees the teachers and students of their academy; the administration everyone.
        $scope = fn (Builder $query): Builder => $viewer->isManager()
            ? $query->where('academy_id', $viewer->academy_id)->whereIn('role', [UserRole::Teacher, UserRole::Student])
            : $query->inAcademy($academyId);

        $users = $scope(User::query())
            ->when($role, fn (Builder $query, UserRole $role) => $query->where('role', $role))
            ->search($search)
            ->when($status === 'active', fn (Builder $query) => $query->where('is_active', true))
            ->when($status === 'inactive', fn (Builder $query) => $query->where('is_active', false))
            ->with(['halaqat:id,name,color', 'academy:id,name'])
            ->withCount(['halaqat', 'teachingHalaqat'])
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        $counts = $scope(User::query())->toBase()->selectRaw('role, COUNT(*) as aggregate')->groupBy('role')->pluck('aggregate', 'role');

        return Inertia::render('users/index', [
            'users' => $this->paginated($users, UserResource::class),
            'filters' => ['role' => $role?->value, 'status' => $status, 'search' => $search, 'academy_id' => $academyId],
            'counts' => [
                'all' => (int) $counts->sum(),
                'admin' => (int) ($counts['admin'] ?? 0),
                'manager' => (int) ($counts['manager'] ?? 0),
                'teacher' => (int) ($counts['teacher'] ?? 0),
                'student' => (int) ($counts['student'] ?? 0),
            ],
            'academies' => $viewer->isAdmin() ? Academy::query()->orderBy('name')->get(['id', 'name']) : [],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request): Response
    {
        $this->authorize('create', User::class);

        $viewer = $request->user();

        return Inertia::render('users/form', [
            'user' => null,
            'defaults' => [
                'role' => UserRole::tryFrom((string) $request->query('role'))?->value ?? UserRole::Student->value,
                'academy_id' => $viewer->isManager() ? $viewer->academy_id : ($request->integer('academy_id') ?: null),
                'timezone' => $viewer->academy?->timezone ?: Setting::get('default_timezone'),
                'locale' => config('app.locale'),
                'halaqa_id' => $request->integer('halaqa_id') ?: null,
            ],
            ...$this->formOptions($viewer),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(UserRequest $request): RedirectResponse
    {
        $user = new User([
            ...$request->safe()->except(['avatar', 'remove_avatar', 'halaqat', 'send_credentials', 'academy_id']),
            'academy_id' => $request->academyId(),
        ]);
        $user->updateAvatar($request->file('avatar'));
        $user->save();

        $this->linkManager($user);

        if ($user->isStudent()) {
            $this->syncHalaqat($user, $request->input('halaqat', []));
        }

        if ($request->boolean('send_credentials')) {
            $this->notifier->send($user, new AccountCreated((string) $request->input('password')));
        }

        $this->toast(__('User created successfully.'));

        return redirect()->route('users.show', $user);
    }

    /**
     * Display the specified resource.
     */
    public function show(User $user): Response
    {
        $this->authorize('view', $user);

        $props = ['user' => [...(new UserResource($user->load('academy')))->resolve(), ...$this->details($user)]];

        if ($user->isStudent()) {
            $props['summary'] = $this->progress->summary($user);
            $props['records'] = ProgressRecordResource::collection(
                $user->progressRecords()->with(['teacher', 'halaqa', 'groupRecords'])->latest('recorded_on')->latest('id')->limit(8)->get(),
            )->resolve();
            $props['halaqat'] = HalaqaResource::collection($user->halaqat()->with('teacher')->withCount('students')->get())->resolve();
        }

        if ($user->isTeacher()) {
            $halaqaIds = $user->teachingHalaqat()->pluck('id');

            $props['halaqat'] = HalaqaResource::collection($user->teachingHalaqat()->with('teacher')->withCount('students')->get())->resolve();
            $props['sessions'] = SessionResource::collection(
                HalaqaSession::query()->visibleTo($user)->with(['halaqa', 'teacher'])->latest('starts_at')->limit(8)->get(),
            )->resolve();
            $props['teacherStats'] = [
                'students' => DB::table('halaqa_student')->whereIn('halaqa_id', $halaqaIds)->distinct()->count('student_id'),
                'sessions_completed' => HalaqaSession::query()->visibleTo($user)
                    ->where('status', SessionStatus::Completed)
                    ->where('starts_at', '>=', now()->subDays(30))
                    ->count(),
                'records' => ProgressRecord::query()->where('teacher_id', $user->id)->where('recorded_on', '>=', now()->subDays(30))->count(),
            ];
        }

        return Inertia::render('users/show', $props);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(User $user): Response
    {
        $this->authorize('update', $user);

        return Inertia::render('users/form', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role->value,
                'academy_id' => $user->academy_id,
                'avatar_url' => $user->avatar_url,
                ...$this->details($user),
                'halaqat' => $user->halaqat()->pluck('halaqat.id'),
            ],
            'defaults' => null,
            ...$this->formOptions(request()->user()),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UserRequest $request, User $user): RedirectResponse
    {
        $data = [
            ...$request->safe()->except(['avatar', 'remove_avatar', 'halaqat', 'send_credentials', 'password', 'academy_id']),
            'academy_id' => $request->academyId(),
        ];

        if ($request->user()->is($user)) {
            unset($data['role'], $data['is_active'], $data['academy_id']);
        }

        $user->fill($data);

        if ($request->filled('password')) {
            $user->password = $request->input('password');
        }

        $user->updateAvatar($request->file('avatar'), $request->boolean('remove_avatar'));
        $user->save();

        $this->linkManager($user);

        if ($user->isStudent()) {
            $this->syncHalaqat($user, $request->input('halaqat', []));
        } else {
            $user->halaqat()->detach();
        }

        if ($request->boolean('send_credentials') && $request->filled('password')) {
            $this->notifier->send($user, new AccountCreated((string) $request->input('password')));
        }

        $this->toast(__('User updated successfully.'));

        return redirect()->route('users.show', $user);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(User $user): RedirectResponse
    {
        $this->authorize('delete', $user);

        $user->updateAvatar(null, remove: true);
        $user->delete();

        $this->toast(__('User deleted.'));

        return redirect()->route('users.index');
    }

    /**
     * Activate or deactivate an account.
     */
    public function toggleActive(User $user): RedirectResponse
    {
        $this->authorize('delete', $user);

        $user->forceFill(['is_active' => ! $user->is_active])->save();

        $this->toast($user->is_active ? __('Account activated.') : __('Account deactivated.'));

        return back();
    }

    /**
     * Profile fields shown on the details page and the edit form.
     *
     * @return array<string, mixed>
     */
    protected function details(User $user): array
    {
        return [
            'gender' => $user->gender?->value,
            'birth_date' => $user->birth_date?->toDateString(),
            'country' => $user->country,
            'timezone' => $user->timezone,
            'locale' => $user->locale,
            'bio' => $user->bio,
            'guardian_name' => $user->guardian_name,
            'guardian_phone' => $user->guardian_phone,
            'zoom_user_id' => $user->zoom_user_id,
            'admin_notes' => $user->admin_notes,
            'is_active' => $user->is_active,
            'notify_email' => $user->notify_email,
            'notify_whatsapp' => $user->notify_whatsapp,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function formOptions(User $viewer): array
    {
        return [
            // Halaqat of the viewer's academy (of every academy for the administration, the form keeps
            // those of the chosen academy).
            'halaqat' => Halaqa::query()
                ->visibleTo($viewer)
                ->active()
                ->with('teacher:id,name')
                ->withCount('students')
                ->orderBy('name')
                ->get()
                ->map(fn (Halaqa $halaqa): array => [
                    'id' => $halaqa->id,
                    'academy_id' => $halaqa->academy_id,
                    'name' => $halaqa->name,
                    'color' => $halaqa->color,
                    'gender' => $halaqa->gender->value,
                    'teacher' => $halaqa->teacher?->name,
                    'students_count' => $halaqa->students_count,
                    'capacity' => $halaqa->capacity,
                ]),
            'academies' => $viewer->isAdmin() ? Academy::query()->orderBy('name')->get(['id', 'name']) : [],
            'roles' => array_map(fn (UserRole $role): string => $role->value, $viewer->isAdmin() ? UserRole::cases() : [UserRole::Teacher, UserRole::Student]),
            'timezones' => DateTimeZone::listIdentifiers(),
        ];
    }

    /**
     * A manager account becomes the manager of its academy when the academy has none.
     */
    protected function linkManager(User $user): void
    {
        if ($user->isManager() && $user->academy !== null && $user->academy->manager_id === null) {
            $user->academy->forceFill(['manager_id' => $user->id])->save();
        }
    }

    /**
     * @param  array<int, int|string>  $halaqaIds
     */
    protected function syncHalaqat(User $student, array $halaqaIds): void
    {
        $changes = $student->halaqat()->sync(array_map('intval', $halaqaIds));

        Halaqa::query()
            ->with('teacher')
            ->whereIn('id', $changes['attached'])
            ->get()
            ->each(fn (Halaqa $halaqa) => $this->notifier->send($student, new AddedToHalaqa($halaqa)));
    }
}
