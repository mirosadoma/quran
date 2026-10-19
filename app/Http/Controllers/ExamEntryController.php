<?php

namespace App\Http\Controllers;

use App\Exceptions\ExamException;
use App\Http\Requests\ExamGradeRequest;
use App\Models\ExamEntry;
use App\Models\ExamExaminer;
use App\Services\Exams\ExamQueue;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * What an examiner (or the manager) does with a student in the queue, and the results.
 */
class ExamEntryController extends Controller
{
    public function __construct(protected ExamQueue $queue) {}

    public function alert(Request $request, ExamEntry $entry): RedirectResponse
    {
        $this->examinerOf($request, $entry);

        return $this->attempt(fn () => $this->queue->alert($entry), __('The student was told to get ready.'));
    }

    public function call(Request $request, ExamEntry $entry): RedirectResponse
    {
        $this->examinerOf($request, $entry);

        return $this->attempt(fn () => $this->queue->call($entry), __('The student was called into the private room.'));
    }

    /**
     * Finish with the student, recording the result at the same time when given.
     */
    public function finish(ExamGradeRequest $request, ExamEntry $entry): RedirectResponse
    {
        $examiner = $this->examinerOf($request, $entry);

        return $this->attempt(
            fn () => $this->queue->finish($entry, $request->grade(), $request->score(), $request->notes(), $examiner),
            $request->grade() !== null || $request->score() !== null ? __('Result recorded.') : __('Finished with the student. You can record the result later.'),
        );
    }

    public function grade(ExamGradeRequest $request, ExamEntry $entry): RedirectResponse
    {
        $examiner = $this->examinerOf($request, $entry);

        if ($request->grade() === null && $request->score() === null) {
            $this->queue->clearGrade($entry);
            $this->toast(__('The result was removed.'));

            return back();
        }

        $this->queue->grade($entry, $request->grade(), $request->score(), $request->notes(), $examiner);

        $this->toast(__('Result recorded.'));

        return back();
    }

    public function absent(Request $request, ExamEntry $entry): RedirectResponse
    {
        $this->examinerOf($request, $entry);

        $this->queue->markAbsent($entry);
        $this->toast(__('The student was marked absent.'));

        return back();
    }

    public function reset(Request $request, ExamEntry $entry): RedirectResponse
    {
        $this->examinerOf($request, $entry);

        $this->queue->reset($entry);
        $this->toast(__('The student is back in the queue.'));

        return back();
    }

    /**
     * Send the student their result (the manager only).
     */
    public function publish(ExamEntry $entry): RedirectResponse
    {
        $this->authorize('update', $entry->day->exam);

        return $this->attempt(fn () => $this->queue->publish($entry), __('The result was sent to the student.'));
    }

    /**
     * The examiner acting on the entry: the examiner the student is assigned to, or the manager
     * of the academy (who may act on anyone, and is recorded as the grader when they examine).
     */
    protected function examinerOf(Request $request, ExamEntry $entry): ?ExamExaminer
    {
        $user = $request->user();
        $day = $entry->day()->with(['exam', 'examiners'])->firstOrFail();
        $entry->setRelation('day', $day);

        $examiner = $day->examinerFor($user);

        abort_unless($day->isManagedBy($user) || ($examiner !== null && $examiner->id === $entry->examiner_id), 403);

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
