<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Http\Requests\ExamRequest;
use App\Http\Resources\ExamResource;
use App\Models\Academy;
use App\Models\Exam;
use App\Models\ExamDay;
use App\Models\Halaqa;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\ExamCreated;
use App\Notifications\ExamScheduled;
use App\Services\Exams\ExamDistributor;
use App\Services\Exams\ExamRooms;
use App\Services\Notifier;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ExamController extends Controller
{
    public function __construct(
        protected ExamDistributor $distributor,
        protected ExamRooms $rooms,
        protected Notifier $notifier,
    ) {}

    /**
     * The exams the user takes part in: all of the academy for its manager, the ones a teacher
     * examines in, and the ones a student is examined in.
     */
    public function index(Request $request): Response
    {
        $this->authorize('viewAny', Exam::class);

        $user = $request->user();
        $filter = in_array($request->query('filter'), ['upcoming', 'finished', 'all'], true) ? $request->query('filter') : 'upcoming';

        $exams = Exam::query()
            ->visibleTo($user)
            ->with(['academy', 'days'])
            ->withCount('days')
            ->when($filter === 'upcoming', fn (Builder $query) => $query->whereHas('days', fn (Builder $query) => $query->where('status', '!=', 'closed')))
            ->when($filter === 'finished', fn (Builder $query) => $query->whereDoesntHave('days', fn (Builder $query) => $query->where('status', '!=', 'closed')))
            ->orderByDesc('id')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('exams/index', [
            'exams' => $this->paginated($exams, ExamResource::class),
            'filters' => ['filter' => $filter],
            'can' => ['create' => $user->can('create', Exam::class)],
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request): Response
    {
        $this->authorize('create', Exam::class);

        return Inertia::render('exams/form', [
            'exam' => null,
            ...$this->formOptions($request->user(), null),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(ExamRequest $request): RedirectResponse
    {
        $academyId = $request->academyId();
        $academy = Academy::query()->withTrashed()->find($academyId);

        $exam = DB::transaction(function () use ($request, $academyId, $academy): Exam {
            $exam = Exam::query()->create([
                'academy_id' => $academyId,
                'title' => $request->validated('title'),
                'description' => $request->validated('description'),
                'max_score' => $request->validated('max_score'),
                'created_by' => $request->user()->id,
            ]);

            foreach ($request->days($this->timezoneOf($academy)) as $data) {
                $day = $exam->days()->create(['starts_at' => $data['starts_at'], 'ends_at' => $data['ends_at']]);
                $day->halaqat()->sync($data['halaqa_ids']);
                $this->distributor->syncStudents($day);
            }

            return $exam;
        });

        $exam->load(['academy', 'days']);

        $this->notifier->send($this->teachersOf($exam), new ExamCreated($exam));

        foreach ($exam->days as $day) {
            $this->notifyStudents($day, $day->halaqat()->pluck('halaqat.id')->all());
        }

        $this->toast(__('Exam created. Add the examiners of every day and share the students among them.'));

        return redirect()->route('exams.show', $exam);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Exam $exam): Response
    {
        $this->authorize('view', $exam);

        $user = $request->user();
        $manages = $exam->isManagedBy($user);
        $seesResults = $user->can('viewResults', $exam);

        $exam->load([
            'academy',
            'creator',
            'days.exam',
            'days.halaqat',
            'days.examiners.user',
            'days.examiners.day',
            'days.entries' => fn ($query) => $query
                ->when($user->isStudent(), fn ($query) => $query->where('student_id', $user->id))
                ->with(['student', 'halaqa', 'examiner', 'grader', 'day.exam']),
        ]);

        return Inertia::render('exams/show', [
            'exam' => (new ExamResource($exam))->resolve(),
            'missingStudents' => $manages
                ? $exam->days->mapWithKeys(fn (ExamDay $day): array => [
                    $day->id => $this->distributor->missingStudents($day)->map(fn (User $student): array => [
                        'id' => $student->id,
                        'name' => $student->name,
                    ])->values()->all(),
                ])
                : (object) [],
            'teachers' => $manages
                ? User::query()
                    ->where('academy_id', $exam->academy_id)
                    ->whereIn('role', [UserRole::Teacher, UserRole::Manager])
                    ->active()
                    ->orderBy('name')
                    ->get()
                    ->map(fn (User $teacher): array => ['id' => $teacher->id, 'name' => $teacher->name, 'role' => $teacher->role->value])
                    ->values()
                : [],
            'embedded' => $this->rooms->isEmbedded(),
            'can' => [
                'update' => $manages,
                'delete' => $manages,
                'view_results' => $seesResults,
            ],
        ]);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Request $request, Exam $exam): Response
    {
        $this->authorize('update', $exam);

        $exam->load(['days.halaqat']);
        $timezone = $this->timezoneOf($exam->academy);

        return Inertia::render('exams/form', [
            'exam' => [
                ...(new ExamResource($exam))->resolve(),
                'days' => $exam->days->map(fn (ExamDay $day): array => [
                    'id' => $day->id,
                    'date' => $day->starts_at->copy()->setTimezone($timezone)->toDateString(),
                    'start_time' => $day->starts_at->copy()->setTimezone($timezone)->format('H:i'),
                    'end_time' => $day->ends_at?->copy()->setTimezone($timezone)->format('H:i') ?? '',
                    'halaqa_ids' => $day->halaqat->pluck('id')->all(),
                    'status' => $day->status->value,
                ])->values()->all(),
            ],
            ...$this->formOptions($request->user(), $exam),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(ExamRequest $request, Exam $exam): RedirectResponse
    {
        $exam->load('days.halaqat');
        $timezone = $this->timezoneOf($exam->academy);
        $newHalaqatByDay = [];

        DB::transaction(function () use ($request, $exam, $timezone, &$newHalaqatByDay): void {
            $exam->update($request->safe()->only(['title', 'description', 'max_score']));

            $kept = [];

            foreach ($request->days($timezone) as $data) {
                $day = $data['id'] !== null ? $exam->days->firstWhere('id', $data['id']) : null;

                if ($day === null) {
                    $day = $exam->days()->create(['starts_at' => $data['starts_at'], 'ends_at' => $data['ends_at']]);
                    $before = [];
                } else {
                    $before = $day->halaqat->pluck('id')->all();

                    if (! $day->isClosed()) {
                        $day->update(['starts_at' => $data['starts_at'], 'ends_at' => $data['ends_at']]);
                    }
                }

                $day->halaqat()->sync($data['halaqa_ids']);
                $this->distributor->syncStudents($day);

                $newHalaqatByDay[$day->id] = array_values(array_diff($data['halaqa_ids'], $before));
                $kept[] = $day->id;
            }

            // Days removed from the form go, unless they already ran.
            $exam->days()->whereNotIn('id', $kept)->where('status', 'scheduled')->get()->each->delete();
        });

        $exam->load('days');

        foreach ($exam->days as $day) {
            if (! empty($newHalaqatByDay[$day->id])) {
                $this->notifyStudents($day, $newHalaqatByDay[$day->id]);
            }
        }

        $this->toast(__('Exam updated.'));

        return redirect()->route('exams.show', $exam);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Exam $exam): RedirectResponse
    {
        $this->authorize('delete', $exam);

        $exam->delete();

        $this->toast(__('Exam deleted.'));

        return redirect()->route('exams.index');
    }

    /**
     * Tell the students of the given halaqat about the exam day.
     *
     * @param  list<int>  $halaqaIds
     */
    protected function notifyStudents(ExamDay $day, array $halaqaIds): void
    {
        if ($halaqaIds === []) {
            return;
        }

        $day->loadMissing('exam');

        $students = User::query()
            ->students()
            ->active()
            ->whereIn('id', DB::table('halaqa_student')->whereIn('halaqa_id', $halaqaIds)->select('student_id'))
            ->get();

        $this->notifier->send($students, new ExamScheduled($day));
    }

    /**
     * The teachers of the academy, who hear about every new exam.
     *
     * @return Collection<int, User>
     */
    protected function teachersOf(Exam $exam)
    {
        return User::query()->teachers()->active()->where('academy_id', $exam->academy_id)->get();
    }

    /**
     * The timezone the exam times are entered in: the academy's, or the platform's default.
     */
    protected function timezoneOf(?Academy $academy): string
    {
        return $academy?->timezone ?: (string) Setting::get('default_timezone');
    }

    /**
     * @return array<string, mixed>
     */
    protected function formOptions(User $user, ?Exam $exam): array
    {
        $academyId = $exam?->academy_id ?? ($user->isManager() ? $user->academy_id : null);

        $halaqat = Halaqa::query()
            ->active()
            ->when($user->isManager(), fn (Builder $query) => $query->where('academy_id', $user->academy_id))
            ->when($exam !== null, fn (Builder $query) => $query->where('academy_id', $exam->academy_id))
            ->with('teacher')
            ->withCount('students')
            ->orderBy('name')
            ->get()
            ->map(fn (Halaqa $halaqa): array => [
                'id' => $halaqa->id,
                'academy_id' => $halaqa->academy_id,
                'name' => $halaqa->name,
                'color' => $halaqa->color,
                'teacher' => $halaqa->teacher?->name,
                'students_count' => $halaqa->students_count,
            ])
            ->values();

        $academies = $user->isAdmin() && $exam === null
            ? Academy::query()->active()->orderBy('name')->get()->map(fn (Academy $academy): array => [
                'id' => $academy->id,
                'name' => $academy->name,
                'timezone' => $this->timezoneOf($academy),
            ])->values()
            : collect();

        return [
            'halaqat' => $halaqat,
            'academies' => $academies,
            'academyId' => $academyId,
            'timezone' => $this->timezoneOf($exam?->academy ?? ($academyId ? Academy::query()->withTrashed()->find($academyId) : null)),
            'defaults' => ['max_score' => 100, 'start_time' => '17:00'],
        ];
    }
}
