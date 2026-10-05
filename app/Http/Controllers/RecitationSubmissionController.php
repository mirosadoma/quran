<?php

namespace App\Http\Controllers;

use App\Http\Requests\RecitationSubmissionRequest;
use App\Models\Halaqa;
use App\Models\RecitationSubmission;
use App\Notifications\RecitationSubmitted;
use App\Services\Notifier;
use Illuminate\Http\RedirectResponse;

class RecitationSubmissionController extends Controller
{
    public function __construct(protected Notifier $notifier) {}

    /**
     * Enter (or change) the recitation the student is about to recite in the halaqa.
     */
    public function update(RecitationSubmissionRequest $request, Halaqa $halaqa): RedirectResponse
    {
        $this->authorize('submitRecitation', $halaqa);

        $submission = RecitationSubmission::query()->updateOrCreate(
            ['student_id' => $request->user()->id, 'halaqa_id' => $halaqa->id],
            ['portions' => $request->portions(), 'notes' => $request->input('notes')],
        );

        if ($submission->wasRecentlyCreated) {
            $submission->setRelation('student', $request->user());
            $halaqa->loadMissing('teacher');
            $this->notifier->send($halaqa->teacher, new RecitationSubmitted($submission));
        }

        $this->toast(__('Your recitation was sent to the teacher.'));

        return back();
    }

    /**
     * Withdraw or dismiss a pending recitation.
     */
    public function destroy(RecitationSubmission $submission): RedirectResponse
    {
        $this->authorize('delete', $submission);

        $submission->delete();

        $this->toast(__('Recitation removed.'));

        return back();
    }
}
