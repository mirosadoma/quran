<?php

namespace App\Http\Controllers;

use App\Enums\SessionStatus;
use App\Exceptions\MeetingException;
use App\Http\Resources\SessionResource;
use App\Models\HalaqaSession;
use App\Models\User;
use App\Services\Meetings\MeetingManager;
use App\Services\SessionLifecycle;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class SessionMeetingController extends Controller
{
    public function __construct(
        protected MeetingManager $meetings,
        protected SessionLifecycle $lifecycle,
    ) {}

    /**
     * Enter the meeting. The halaqa teacher starts the session on the first join,
     * and students are marked present (or late) automatically.
     */
    public function join(Request $request, HalaqaSession $session): RedirectResponse
    {
        $this->authorize('view', $session);

        $user = $request->user();

        if (! $session->isJoinableBy($user)) {
            $this->toast(__('The session is not open for joining right now.'), 'error');

            return redirect()->route('sessions.show', $session);
        }

        try {
            if ($session->status === SessionStatus::Scheduled && $this->startsOnJoin($session, $user)) {
                $this->lifecycle->start($session);
            }

            $target = $this->meetings->joinTarget($session, $user);
        } catch (MeetingException $exception) {
            $this->toast($exception->getMessage(), 'error');

            return redirect()->route('sessions.show', $session);
        }

        $this->lifecycle->recordJoin($session, $user);

        if ($target->isEmbedded()) {
            return redirect()->route('sessions.room', $session);
        }

        return redirect()->away((string) $target->url);
    }

    /**
     * The meeting embedded inside the platform (Jitsi JaaS or self-hosted).
     */
    public function room(Request $request, HalaqaSession $session): Response|SymfonyResponse
    {
        $this->authorize('view', $session);

        $user = $request->user();

        if (! $session->isJoinableBy($user)) {
            $this->toast(__('The session is not open for joining right now.'), 'error');

            return redirect()->route('sessions.show', $session);
        }

        try {
            $target = $this->meetings->joinTarget($session, $user);
        } catch (MeetingException $exception) {
            $this->toast($exception->getMessage(), 'error');

            return redirect()->route('sessions.show', $session);
        }

        if (! $target->isEmbedded()) {
            return Inertia::location((string) $target->url);
        }

        $this->lifecycle->recordJoin($session, $user);
        $session->load(['halaqa', 'teacher']);

        return Inertia::render('sessions/room', [
            'session' => (new SessionResource($session))->resolve(),
            'meeting' => $target->embed,
            'isModerator' => $session->isManagedBy($user),
        ]);
    }

    /**
     * End the session and record absences.
     */
    public function end(Request $request, HalaqaSession $session): RedirectResponse
    {
        $this->authorize('update', $session);

        if (! $session->status->isOpen()) {
            $this->toast(__('This session has already ended.'), 'error');

            return redirect()->route('sessions.show', $session);
        }

        $this->lifecycle->end($session, $request->user());

        $this->toast(__('Session ended. Students who did not join were marked absent.'));

        return redirect()->route('sessions.show', $session);
    }

    /**
     * The session's teacher (or an admin when there is no teacher) opens it by joining.
     */
    protected function startsOnJoin(HalaqaSession $session, User $user): bool
    {
        if ($session->teacher_id === null && $session->halaqa->teacher_id === null) {
            return $user->isAdmin();
        }

        return $user->id === $session->teacher_id || $user->id === $session->halaqa->teacher_id;
    }
}
