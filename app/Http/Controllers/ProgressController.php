<?php

namespace App\Http\Controllers;

use App\Enums\Grade;
use App\Enums\ProgressType;
use App\Http\Requests\ProgressRecordRequest;
use App\Http\Resources\ProgressRecordResource;
use App\Http\Resources\UserResource;
use App\Models\Halaqa;
use App\Models\HalaqaSession;
use App\Models\ProgressRecord;
use App\Models\User;
use App\Notifications\ProgressRecorded;
use App\Services\Notifier;
use App\Services\Quran;
use App\Services\Reports;
use App\Services\StudentProgress;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProgressController extends Controller
{
    public function __construct(
        protected Quran $quran,
        protected StudentProgress $progress,
        protected Reports $reports,
        protected Notifier $notifier,
    ) {}

    /**
     * Recitation records of the halaqat the user teaches (all for admins).
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user->isStudent()) {
            return redirect()->route('progress.student', $user);
        }

        $halaqaIds = $user->isAdmin() ? null : $user->teachingHalaqat()->pluck('id')->all();

        $filters = [
            'halaqa_id' => $request->integer('halaqa_id') ?: null,
            'student_id' => $request->integer('student_id') ?: null,
            'type' => ProgressType::tryFrom((string) $request->query('type'))?->value,
            'grade' => Grade::tryFrom((string) $request->query('grade'))?->value,
            'from' => $request->date('from')?->toDateString(),
            'to' => $request->date('to')?->toDateString(),
        ];

        $scope = fn (Builder $query) => $query->when($halaqaIds !== null, fn (Builder $query) => $query->where(
            fn (Builder $query) => $query->whereIn('halaqa_id', $halaqaIds)->orWhere('teacher_id', $user->id),
        ));

        $records = ProgressRecord::query()
            ->tap($scope)
            ->with(['student', 'teacher', 'halaqa'])
            ->when($filters['halaqa_id'], fn (Builder $query, int $id) => $query->where('halaqa_id', $id))
            ->when($filters['student_id'], fn (Builder $query, int $id) => $query->where('student_id', $id))
            ->when($filters['type'], fn (Builder $query, string $type) => $query->where('type', $type))
            ->when($filters['grade'], fn (Builder $query, string $grade) => $query->where('grade', $grade))
            ->when($filters['from'], fn (Builder $query, string $date) => $query->where('recorded_on', '>=', $date))
            ->when($filters['to'], fn (Builder $query, string $date) => $query->where('recorded_on', '<=', $date))
            ->latest('recorded_on')
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        $monthStart = now($user->displayTimezone())->startOfMonth()->toDateString();

        $month = ProgressRecord::query()
            ->tap($scope)
            ->where('recorded_on', '>=', $monthStart)
            ->selectRaw("SUM(CASE WHEN type = 'memorization' THEN ayahs_count ELSE 0 END) as memorized,
                SUM(CASE WHEN type = 'revision' THEN ayahs_count ELSE 0 END) as revised,
                COUNT(*) as records_count,
                AVG(".Grade::scoreSql().') as score')
            ->toBase()
            ->first();

        $students = User::query()
            ->students()
            ->active()
            ->when($halaqaIds !== null, fn (Builder $query) => $query->whereHas('halaqat', fn (Builder $query) => $query->whereIn('halaqat.id', $halaqaIds)))
            ->with('halaqat:id')
            ->orderBy('name')
            ->get()
            ->map(fn (User $student): array => [
                'id' => $student->id,
                'name' => $student->name,
                'halaqa_ids' => $student->halaqat->pluck('id')->values(),
            ]);

        return Inertia::render('progress/index', [
            'records' => $this->paginated($records, ProgressRecordResource::class),
            'filters' => $filters,
            'halaqat' => $user->accessibleHalaqat()->orderBy('name')->get(['id', 'name', 'color']),
            'students' => $students,
            'stats' => [
                'memorized' => (int) ($month->memorized ?? 0),
                'revised' => (int) ($month->revised ?? 0),
                'records' => (int) ($month->records_count ?? 0),
                'average_grade' => $month?->score !== null ? Grade::fromScore((float) $month->score)->value : null,
            ],
        ]);
    }

    /**
     * Progress page of one student: juz map, records and charts.
     */
    public function student(Request $request, User $student): Response
    {
        $this->authorize('viewProgress', $student);

        $user = $request->user();
        $type = ProgressType::tryFrom((string) $request->query('type'))?->value;
        $student->load('halaqat:id,name,color,teacher_id');

        $records = $student->progressRecords()
            ->with(['teacher', 'halaqa'])
            ->when($type, fn (Builder $query, string $type) => $query->where('type', $type))
            ->latest('recorded_on')
            ->latest('id')
            ->paginate(15)
            ->withQueryString();

        $canRecord = $user->can('recordProgress', $student);

        $lastMemorized = $student->progressRecords()
            ->where('type', ProgressType::Memorization)
            ->latest('recorded_on')
            ->latest('id')
            ->first(['to_surah', 'to_ayah']);

        return Inertia::render('progress/student', [
            'student' => [
                ...(new UserResource($student))->resolve(),
                'halaqat' => $student->halaqat->map(fn (Halaqa $halaqa): array => [
                    'id' => $halaqa->id,
                    'name' => $halaqa->name,
                    'color' => $halaqa->color,
                ])->values(),
            ],
            'summary' => $this->progress->summary($student),
            'records' => $this->paginated($records, ProgressRecordResource::class),
            'weekly' => $this->reports->weeklyMemorization([$student->id], now()->subWeeks(12)->addDay()->startOfDay(), now()),
            'filters' => ['type' => $type],
            'canRecord' => $canRecord,
            'halaqat' => $canRecord
                ? $student->halaqat
                    ->filter(fn (Halaqa $halaqa): bool => $user->isAdmin() || $halaqa->teacher_id === $user->id)
                    ->map(fn (Halaqa $halaqa): array => ['id' => $halaqa->id, 'name' => $halaqa->name, 'color' => $halaqa->color])
                    ->values()
                : [],
            'lastPosition' => $lastMemorized ? ['surah' => $lastMemorized->to_surah, 'ayah' => $lastMemorized->to_ayah] : null,
        ]);
    }

    /**
     * Record a recitation (memorization or revision).
     */
    public function store(ProgressRecordRequest $request): RedirectResponse
    {
        $user = $request->user();
        $student = User::query()->findOrFail($request->integer('student_id'));

        $this->authorize('recordProgress', $student);

        $halaqa = $this->resolveHalaqa($request, $user, $student);
        $sessionId = $request->integer('halaqa_session_id') ?: null;

        if ($sessionId !== null && ! HalaqaSession::query()->whereKey($sessionId)->where('halaqa_id', $halaqa?->id)->exists()) {
            $sessionId = null;
        }

        $record = ProgressRecord::query()->create([
            ...$this->recordAttributes($request),
            'student_id' => $student->id,
            'halaqa_id' => $halaqa?->id,
            'halaqa_session_id' => $sessionId,
            'teacher_id' => $user->isTeacher() ? $user->id : $halaqa?->teacher_id,
            'recorded_on' => $request->date('recorded_on')?->toDateString() ?? now($user->displayTimezone())->toDateString(),
        ]);

        $this->notifier->send($student, new ProgressRecorded($record));

        $this->toast(__('Recitation recorded.'));

        return back();
    }

    /**
     * Update a recitation record.
     */
    public function update(ProgressRecordRequest $request, ProgressRecord $record): RedirectResponse
    {
        $this->authorize('update', $record);

        $record->update([
            ...$this->recordAttributes($request),
            'recorded_on' => $request->date('recorded_on')?->toDateString() ?? $record->recorded_on,
        ]);

        $this->toast(__('Record updated.'));

        return back();
    }

    /**
     * Delete a recitation record.
     */
    public function destroy(ProgressRecord $record): RedirectResponse
    {
        $this->authorize('delete', $record);

        $record->delete();

        $this->toast(__('Record deleted.'));

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    protected function recordAttributes(ProgressRecordRequest $request): array
    {
        return [
            'type' => $request->input('type'),
            'from_surah' => $request->integer('from_surah'),
            'from_ayah' => $request->integer('from_ayah'),
            'to_surah' => $request->integer('to_surah'),
            'to_ayah' => $request->integer('to_ayah'),
            'ayahs_count' => $this->quran->countRange(
                $request->integer('from_surah'),
                $request->integer('from_ayah'),
                $request->integer('to_surah'),
                $request->integer('to_ayah'),
            ),
            'grade' => $request->input('grade'),
            'mistakes' => $request->integer('mistakes'),
            'notes' => $request->input('notes'),
        ];
    }

    /**
     * The halaqa the record belongs to: the requested one if the user manages it,
     * otherwise the student's first halaqa taught by the user.
     */
    protected function resolveHalaqa(ProgressRecordRequest $request, User $user, User $student): ?Halaqa
    {
        $query = $student->halaqat()->when($user->isTeacher(), fn ($query) => $query->where('teacher_id', $user->id));

        if ($request->filled('halaqa_id')) {
            $halaqa = (clone $query)->whereKey($request->integer('halaqa_id'))->first();

            abort_if($halaqa === null && ! $user->isAdmin(), 403);

            return $halaqa ?? Halaqa::query()->find($request->integer('halaqa_id'));
        }

        return $query->first();
    }
}
