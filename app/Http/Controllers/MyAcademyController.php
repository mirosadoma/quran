<?php

namespace App\Http\Controllers;

use App\Enums\JoinRequestStatus;
use App\Http\Resources\AcademyResource;
use App\Http\Resources\HalaqaResource;
use App\Http\Resources\JoinRequestResource;
use App\Models\Academy;
use App\Models\AcademyJoinRequest;
use App\Models\Halaqa;
use App\Models\User;
use App\Notifications\JoinRequestReceived;
use App\Notifications\StudentLeftAcademy;
use App\Services\Notifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * A student's academy: the one they study at, or the academies they can ask to join. A student
 * belongs to one academy at a time and leaves it before joining another.
 */
class MyAcademyController extends Controller
{
    public function __construct(protected Notifier $notifier) {}

    public function show(Request $request): Response
    {
        $user = $request->user();

        abort_unless($user->isStudent(), 403);

        $academy = $user->academy_id !== null ? $user->academy : null;

        return Inertia::render('academies/mine', [
            'academy' => $academy ? (new AcademyResource($academy->load('manager')->loadCount(['teachers', 'students', 'halaqat'])))->resolve() : null,
            'halaqat' => $academy ? HalaqaResource::collection($user->halaqat()->with('teacher')->withCount('students')->get())->resolve() : [],
            'requests' => JoinRequestResource::collection($user->joinRequests()->with('academy')->latest()->limit(10)->get())->resolve(),
            'academies' => $academy ? [] : AcademyResource::collection(
                Academy::query()->open()->withCount(['teachers', 'students', 'halaqat'])->orderBy('name')->get(),
            )->resolve(),
            'join' => $request->query('join'),
        ]);
    }

    /**
     * Ask to join an academy.
     */
    public function join(Request $request, Academy $academy): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user->isStudent(), 403);

        $validated = $request->validate(['message' => ['nullable', 'string', 'max:1000']]);

        $problem = match (true) {
            $user->academy_id !== null => __('You already study at an academy. Leave it first to join another one.'),
            ! $academy->is_active || ! $academy->accepts_requests => __('This academy does not accept new students at the moment.'),
            $user->joinRequests()->pending()->exists() => __('You already have a request waiting for an answer. Cancel it first to ask another academy.'),
            default => null,
        };

        if ($problem !== null) {
            $this->toast($problem, 'error');

            return redirect()->route('my-academy');
        }

        $joinRequest = $user->joinRequests()->create([
            'academy_id' => $academy->id,
            'status' => JoinRequestStatus::Pending,
            'message' => $validated['message'] ?? null,
        ]);

        $managers = $academy->manager ?? User::query()->admins()->active()->get();
        $this->notifier->send($managers, new JoinRequestReceived($joinRequest->load(['academy', 'user'])));

        $this->toast(__('Your request was sent to :academy. You will be notified of the answer.', ['academy' => $academy->name]));

        return redirect()->route('my-academy');
    }

    /**
     * Withdraw a request that waits for an answer.
     */
    public function cancel(AcademyJoinRequest $joinRequest): RedirectResponse
    {
        $this->authorize('cancel', $joinRequest);

        $joinRequest->update(['status' => JoinRequestStatus::Cancelled]);

        $this->toast(__('The request was cancelled.'));

        return back();
    }

    /**
     * Leave the academy: the student is removed from its halaqat and may then join another one.
     */
    public function leave(Request $request): RedirectResponse
    {
        $user = $request->user();

        abort_unless($user->isStudent() && $user->academy_id !== null, 403);

        $academy = $user->academy;

        DB::transaction(function () use ($user, $academy): void {
            $user->halaqat()->detach(Halaqa::query()->where('academy_id', $academy->id)->pluck('id'));
            $user->forceFill(['academy_id' => null])->save();
        });

        $this->notifier->send($academy->manager, new StudentLeftAcademy($user, $academy));

        $this->toast(__('You left :academy. You can now ask to join another academy.', ['academy' => $academy->name]));

        return redirect()->route('my-academy');
    }
}
