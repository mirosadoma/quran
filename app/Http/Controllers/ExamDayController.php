<?php

namespace App\Http\Controllers;

use App\Exceptions\ExamException;
use App\Http\Requests\ExamDistributionRequest;
use App\Models\ExamDay;
use App\Services\Exams\ExamDayLifecycle;
use App\Services\Exams\ExamDistributor;
use App\Services\Exams\ExamQueue;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * What the manager does with an exam day: opening it, starting the examining, closing it,
 * and sharing the students among the examiners.
 */
class ExamDayController extends Controller
{
    public function __construct(
        protected ExamDayLifecycle $lifecycle,
        protected ExamDistributor $distributor,
        protected ExamQueue $queue,
    ) {}

    public function open(Request $request, ExamDay $day): RedirectResponse
    {
        $this->authorize('update', $day->exam);

        try {
            $this->lifecycle->open($day, $request->user());
        } catch (ExamException $exception) {
            $this->toast($exception->getMessage(), 'error');

            return back();
        }

        $this->toast(__('The exam day is open. Students and examiners were invited to the main hall.'));

        return $request->boolean('enter') ? redirect()->route('exams.room', $day) : back();
    }

    public function startExamining(ExamDay $day): RedirectResponse
    {
        $this->authorize('update', $day->exam);

        try {
            $this->lifecycle->startExamining($day);
        } catch (ExamException $exception) {
            $this->toast($exception->getMessage(), 'error');

            return back();
        }

        $this->toast(__('The examining has started. Every student was sent to the hall of their examiner.'));

        return back();
    }

    public function close(Request $request, ExamDay $day): RedirectResponse
    {
        $this->authorize('update', $day->exam);

        $absent = $this->lifecycle->close($day, $request->user());

        $this->toast($absent > 0
            ? __('The exam day is closed. :count students who were not examined were marked absent.', ['count' => $absent])
            : __('The exam day is closed.'));

        return redirect()->route('exams.show', $day->exam_id);
    }

    /**
     * Add the students who joined the day's halaqat since the exam was planned.
     */
    public function syncStudents(ExamDay $day): RedirectResponse
    {
        $this->authorize('update', $day->exam);

        $added = $this->distributor->syncStudents($day);

        $this->toast($added > 0 ? __(':count students were added.', ['count' => $added]) : __('The list of students is up to date.'));

        return back();
    }

    /**
     * Share the students evenly among the examiners.
     */
    public function autoAssign(Request $request, ExamDay $day): RedirectResponse
    {
        $this->authorize('update', $day->exam);

        if ($day->examiners()->doesntExist()) {
            $this->toast(__('Add the examiners first.'), 'error');

            return back();
        }

        $this->distributor->autoAssign($day, onlyUnassigned: $request->boolean('only_unassigned'));

        $this->toast(__('The students were shared among the examiners.'));

        return back();
    }

    /**
     * Save the manager's own distribution.
     */
    public function distribute(ExamDistributionRequest $request, ExamDay $day): RedirectResponse
    {
        $this->distributor->apply($day, $request->assignments());

        $this->toast(__('The distribution was saved.'));

        return back();
    }

    /**
     * Send every graded result of the day to its student.
     */
    public function publishAll(ExamDay $day): RedirectResponse
    {
        $this->authorize('update', $day->exam);

        $count = $this->queue->publishAll($day);

        $this->toast($count > 0 ? __(':count results were sent to the students.', ['count' => $count]) : __('No new results to send.'));

        return back();
    }
}
