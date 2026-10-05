<?php

namespace App\Http\Controllers;

use App\Enums\JoinRequestStatus;
use App\Http\Resources\JoinRequestResource;
use App\Models\Academy;
use App\Models\AcademyJoinRequest;
use App\Notifications\JoinRequestAnswered;
use App\Services\Notifier;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Requests to join an academy, answered by its manager (or by the administration).
 */
class JoinRequestController extends Controller
{
    public function __construct(protected Notifier $notifier) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        abort_unless($user->managesAcademies(), 403);

        $status = JoinRequestStatus::tryFrom((string) $request->query('status')) ?? JoinRequestStatus::Pending;
        $academyId = $user->isManager() ? $user->academy_id : ($request->integer('academy_id') ?: null);
        $scope = fn (Builder $query): Builder => $query->when($academyId !== null, fn (Builder $query) => $query->where('academy_id', $academyId));

        $requests = $scope(AcademyJoinRequest::query())
            ->where('status', $status)
            ->with(['user', 'academy', 'decider'])
            ->latest()
            ->paginate(15)
            ->withQueryString();

        $counts = $scope(AcademyJoinRequest::query())->toBase()->selectRaw('status, COUNT(*) as aggregate')->groupBy('status')->pluck('aggregate', 'status');

        return Inertia::render('join-requests/index', [
            'requests' => $this->paginated($requests, JoinRequestResource::class),
            'filters' => ['status' => $status->value, 'academy_id' => $academyId],
            'counts' => collect(JoinRequestStatus::cases())->mapWithKeys(fn (JoinRequestStatus $case): array => [$case->value => (int) ($counts[$case->value] ?? 0)]),
            'academies' => $user->isAdmin() ? Academy::query()->orderBy('name')->get(['id', 'name']) : [],
        ]);
    }

    /**
     * Accept: the student joins the academy (the manager then adds them to a halaqa).
     */
    public function accept(Request $request, AcademyJoinRequest $joinRequest): RedirectResponse
    {
        $this->authorize('decide', $joinRequest);

        $validated = $request->validate(['response' => ['nullable', 'string', 'max:1000']]);
        $student = $joinRequest->user;

        if ($student->academy_id !== null && $student->academy_id !== $joinRequest->academy_id) {
            $joinRequest->update(['status' => JoinRequestStatus::Cancelled]);
            $this->toast(__('This student has already joined another academy.'), 'error');

            return back();
        }

        DB::transaction(function () use ($request, $joinRequest, $student, $validated): void {
            $student->forceFill(['academy_id' => $joinRequest->academy_id])->save();

            $joinRequest->update([
                'status' => JoinRequestStatus::Accepted,
                'response' => $validated['response'] ?? null,
                'decided_by' => $request->user()->id,
                'decided_at' => now(),
            ]);
        });

        $this->notifier->send($student, new JoinRequestAnswered($joinRequest->load('academy')));

        $this->toast(__(':name joined the academy. Add them to a halaqa from its page.', ['name' => $student->name]));

        return back();
    }

    public function reject(Request $request, AcademyJoinRequest $joinRequest): RedirectResponse
    {
        $this->authorize('decide', $joinRequest);

        $validated = $request->validate(['response' => ['nullable', 'string', 'max:1000']]);

        $joinRequest->update([
            'status' => JoinRequestStatus::Rejected,
            'response' => $validated['response'] ?? null,
            'decided_by' => $request->user()->id,
            'decided_at' => now(),
        ]);

        $this->notifier->send($joinRequest->user, new JoinRequestAnswered($joinRequest->load('academy')));

        $this->toast(__('The request was declined.'));

        return back();
    }
}
