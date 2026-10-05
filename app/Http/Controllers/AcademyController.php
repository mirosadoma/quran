<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Requests\AcademyRequest;
use App\Http\Resources\AcademyResource;
use App\Http\Resources\HalaqaResource;
use App\Http\Resources\UserResource;
use App\Models\Academy;
use App\Models\Setting;
use App\Models\User;
use DateTimeZone;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The academies of the platform, run by the administration: create them with their manager's
 * account, follow them, deactivate, archive, restore or delete them, and enter them.
 */
class AcademyController extends Controller
{
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Academy::class);

        $status = in_array($request->query('status'), ['active', 'inactive', 'archived'], true) ? $request->query('status') : null;
        $search = trim((string) $request->query('search'));

        $academies = Academy::query()
            ->when($status === 'archived', fn (Builder $query) => $query->onlyTrashed())
            ->when($status === 'active', fn (Builder $query) => $query->where('is_active', true))
            ->when($status === 'inactive', fn (Builder $query) => $query->where('is_active', false))
            ->when($search !== '', fn (Builder $query) => $query->where(fn (Builder $query) => $query
                ->where('name', 'like', "%{$search}%")
                ->orWhere('location', 'like', "%{$search}%")))
            ->with('manager')
            ->withCount($this->counts())
            ->orderBy('name')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('academies/index', [
            'academies' => $this->paginated($academies, AcademyResource::class),
            'filters' => ['status' => $status, 'search' => $search],
            'totals' => [
                'all' => Academy::query()->count(),
                'active' => Academy::query()->where('is_active', true)->count(),
                'inactive' => Academy::query()->where('is_active', false)->count(),
                'archived' => Academy::onlyTrashed()->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        $this->authorize('create', Academy::class);

        return Inertia::render('academies/form', [
            'academy' => null,
            'timezones' => DateTimeZone::listIdentifiers(),
            'defaultTimezone' => Setting::get('default_timezone'),
        ]);
    }

    public function store(AcademyRequest $request): RedirectResponse
    {
        $academy = DB::transaction(function () use ($request): Academy {
            $academy = new Academy([
                ...$request->safe()->except(['logo', 'remove_logo', 'manager']),
                'slug' => Academy::uniqueSlug((string) $request->validated('name')),
            ]);
            $academy->updateLogo($request->file('logo'));
            $academy->save();

            $this->saveManager($academy, $request);

            return $academy;
        });

        $this->toast(__('The academy was created with its manager account.'));

        return redirect()->route('academies.show', $academy);
    }

    /**
     * The academy at a glance: its manager, numbers, halaqat and teachers.
     */
    public function show(Academy $academy): Response
    {
        $this->authorize('view', $academy);

        $academy->load('manager')->loadCount($this->counts());

        return Inertia::render('academies/show', [
            'academy' => (new AcademyResource($academy))->resolve(),
            'halaqat' => HalaqaResource::collection(
                $academy->halaqat()->with('teacher')->withCount('students')->orderByDesc('is_active')->orderBy('name')->get(),
            )->resolve(),
            'teachers' => UserResource::collection($academy->teachers()->withCount('teachingHalaqat')->orderBy('name')->get())->resolve(),
            'recentStudents' => UserResource::collection($academy->students()->latest()->limit(8)->get())->resolve(),
            'can' => [
                'administer' => request()->user()->can('administer', $academy),
                'impersonate' => request()->user()->can('impersonate', $academy),
                'forceDelete' => request()->user()->can('forceDelete', $academy),
            ],
        ]);
    }

    public function edit(Academy $academy): Response
    {
        $this->authorize('update', $academy);

        return Inertia::render('academies/form', [
            'academy' => (new AcademyResource($academy->load('manager')))->resolve(),
            'timezones' => DateTimeZone::listIdentifiers(),
            'defaultTimezone' => Setting::get('default_timezone'),
        ]);
    }

    public function update(AcademyRequest $request, Academy $academy): RedirectResponse
    {
        $data = $request->safe()->except(['logo', 'remove_logo', 'manager']);

        // Only the administration activates or deactivates an academy.
        if (! $request->user()->can('administer', $academy)) {
            unset($data['is_active']);
        }

        DB::transaction(function () use ($request, $academy, $data): void {
            $academy->fill($data);
            $academy->updateLogo($request->file('logo'), $request->boolean('remove_logo'));
            $academy->save();

            if ($request->hasManager()) {
                $this->saveManager($academy, $request);
            }
        });

        $this->toast(__('The academy was saved.'));

        return $request->user()->isAdmin() ? redirect()->route('academies.show', $academy) : back();
    }

    /**
     * Activate or deactivate: the members of an inactive academy cannot sign in.
     */
    public function toggle(Academy $academy): RedirectResponse
    {
        $this->authorize('administer', $academy);

        $academy->update(['is_active' => ! $academy->is_active]);

        $this->toast($academy->is_active ? __('The academy is active again.') : __('The academy was deactivated; its members cannot sign in until it is activated.'));

        return back();
    }

    /**
     * Archive: the academy and everything in it stay, but nobody can use it until it is restored.
     */
    public function destroy(Academy $academy): RedirectResponse
    {
        $this->authorize('administer', $academy);

        $academy->delete();

        $this->toast(__('The academy was archived. You can restore it from the archive.'));

        return redirect()->route('academies.index');
    }

    public function restore(Academy $academy): RedirectResponse
    {
        $this->authorize('administer', $academy);

        $academy->restore();

        $this->toast(__('The academy was restored.'));

        return redirect()->route('academies.show', $academy);
    }

    /**
     * Delete an archived academy for good: its halaqat, sessions and records, and the accounts of its
     * manager and teachers. Its students keep their accounts and their personal data, without academy.
     */
    public function forceDestroy(Academy $academy): RedirectResponse
    {
        $this->authorize('forceDelete', $academy);

        DB::transaction(function () use ($academy): void {
            $staffIds = $academy->users()->whereIn('role', [UserRole::Manager, UserRole::Teacher])->pluck('id');

            // Halaqat, sessions and records go with the academy; its students are left without academy.
            $academy->forceDelete();

            User::query()->whereKey($staffIds)->get()->each->delete();
        });

        $this->toast(__('The academy was deleted for good.'));

        return redirect()->route('academies.index', ['status' => 'archived']);
    }

    /**
     * Create the manager's account, or update it (a new password only when one is given).
     */
    protected function saveManager(Academy $academy, AcademyRequest $request): void
    {
        $manager = $academy->manager ?? new User([
            'role' => UserRole::Manager,
            'is_active' => true,
            'locale' => config('app.locale'),
        ]);

        $manager->fill([
            'name' => $request->validated('manager.name'),
            'email' => $request->validated('manager.email'),
            'phone' => $request->validated('manager.phone'),
            'academy_id' => $academy->id,
            'timezone' => $academy->timezone ?: Setting::get('default_timezone'),
        ]);

        if (filled($request->validated('manager.password'))) {
            $manager->password = $request->validated('manager.password');
        }

        $manager->role = UserRole::Manager;
        $manager->save();

        if ($academy->manager_id !== $manager->id) {
            $academy->forceFill(['manager_id' => $manager->id])->save();
        }
    }

    /**
     * @return array<string, \Closure|string>
     */
    protected function counts(): array
    {
        return [
            'teachers',
            'students',
            'halaqat',
            'joinRequests as pending_requests_count' => fn (Builder $query) => $query->pending(),
        ];
    }
}
