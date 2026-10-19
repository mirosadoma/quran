<?php

namespace App\Http\Controllers;

use App\Exceptions\ExamException;
use App\Exceptions\MeetingException;
use App\Http\Requests\ExamGradeRequest;
use App\Http\Resources\ExamDayResource;
use App\Models\ExamEntry;
use App\Models\ExamExaminer;
use App\Services\Exams\ExamQueue;
use App\Services\Exams\ExamRooms;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * An examiner invited from outside the platform: they enter with their link, without an
 * account, and only while the exam day runs.
 */
class ExamGuestController extends Controller
{
    public function __construct(protected ExamRooms $rooms, protected ExamQueue $queue) {}

    public function room(string $token): Response
    {
        $examiner = $this->examiner($token);
        $day = $examiner->day;

        $day->load(['exam', 'halaqat', 'examiners.user', 'examiners.day', 'entries' => fn ($query) => $query->with(['student', 'halaqa', 'examiner', 'day.exam'])]);

        $examiner->forceFill(['last_seen_at' => now()])->saveQuietly();

        $this->rooms->ensureMainRoom($day);
        $this->rooms->ensureExaminerRooms($examiner);

        try {
            $rooms = [
                ['key' => 'main', 'label' => __('Main hall'), 'examiner_id' => null, 'target' => $this->rooms->targetForGuest((string) $day->main_room, $examiner)],
                ['key' => "hall-{$examiner->id}", 'label' => __('My hall'), 'examiner_id' => $examiner->id, 'target' => $this->rooms->targetForGuest((string) $examiner->hall_room, $examiner)],
                ['key' => "private-{$examiner->id}", 'label' => __('My private room'), 'examiner_id' => $examiner->id, 'target' => $this->rooms->targetForGuest((string) $examiner->private_room, $examiner)],
            ];
        } catch (MeetingException $exception) {
            abort(503, $exception->getMessage());
        }

        return Inertia::render('exams/room', [
            'day' => (new ExamDayResource($day))->resolve(),
            'viewer' => ['kind' => 'examiner', 'examiner_id' => $examiner->id, 'name' => $examiner->name],
            'rooms' => $rooms,
            'embedded' => $this->rooms->isEmbedded(),
            'guestToken' => $token,
        ]);
    }

    public function alert(string $token, ExamEntry $entry): RedirectResponse
    {
        $this->own($token, $entry);

        return $this->attempt(fn () => $this->queue->alert($entry), __('The student was told to get ready.'));
    }

    public function call(string $token, ExamEntry $entry): RedirectResponse
    {
        $this->own($token, $entry);

        return $this->attempt(fn () => $this->queue->call($entry), __('The student was called into the private room.'));
    }

    public function finish(ExamGradeRequest $request, string $token, ExamEntry $entry): RedirectResponse
    {
        $examiner = $this->own($token, $entry);

        return $this->attempt(
            fn () => $this->queue->finish($entry, $request->grade(), $request->score(), $request->notes(), $examiner),
            $request->grade() !== null || $request->score() !== null ? __('Result recorded.') : __('Finished with the student. You can record the result later.'),
        );
    }

    public function grade(ExamGradeRequest $request, string $token, ExamEntry $entry): RedirectResponse
    {
        $examiner = $this->own($token, $entry);

        if ($request->grade() === null && $request->score() === null) {
            $this->queue->clearGrade($entry);
            $this->toast(__('The result was removed.'));

            return back();
        }

        $this->queue->grade($entry, $request->grade(), $request->score(), $request->notes(), $examiner);
        $this->toast(__('Result recorded.'));

        return back();
    }

    public function absent(string $token, ExamEntry $entry): RedirectResponse
    {
        $this->own($token, $entry);

        $this->queue->markAbsent($entry);
        $this->toast(__('The student was marked absent.'));

        return back();
    }

    public function reset(string $token, ExamEntry $entry): RedirectResponse
    {
        $this->own($token, $entry);

        $this->queue->reset($entry);
        $this->toast(__('The student is back in the queue.'));

        return back();
    }

    /**
     * The examiner of the link, as long as their day is open for them.
     */
    protected function examiner(string $token): ExamExaminer
    {
        $examiner = ExamExaminer::query()->where('token', $token)->with('day.exam')->first();

        abort_if($examiner === null || $examiner->day === null, 404);
        abort_unless($examiner->day->isOpenForGuests(), 403, __('This link works on the exam day only, from an hour before it starts until it is closed.'));

        return $examiner;
    }

    /**
     * The examiner of the link, who must be the examiner of the student.
     */
    protected function own(string $token, ExamEntry $entry): ExamExaminer
    {
        $examiner = $this->examiner($token);

        abort_unless($entry->examiner_id === $examiner->id, 403);

        $entry->setRelation('day', $examiner->day);

        return $examiner;
    }

    protected function attempt(callable $action, string $success): RedirectResponse
    {
        try {
            $action();
        } catch (ExamException $exception) {
            $this->toast($exception->getMessage(), 'error');

            return back();
        }

        $this->toast($success);

        return back();
    }
}
