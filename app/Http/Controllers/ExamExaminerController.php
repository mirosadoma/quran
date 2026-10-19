<?php

namespace App\Http\Controllers;

use App\Http\Requests\ExamExaminerRequest;
use App\Models\ExamDay;
use App\Models\ExamExaminer;
use App\Models\User;
use App\Services\Exams\ExamRooms;
use Illuminate\Http\RedirectResponse;

class ExamExaminerController extends Controller
{
    public function __construct(protected ExamRooms $rooms) {}

    /**
     * Add an examiner to the day: a teacher (or the manager) of the academy, or someone from
     * outside who gets a link.
     */
    public function store(ExamExaminerRequest $request, ExamDay $day): RedirectResponse
    {
        $user = $request->filled('user_id') ? User::query()->find($request->integer('user_id')) : null;

        $examiner = $day->examiners()->create([
            'user_id' => $user?->id,
            'name' => $user?->name ?? trim((string) $request->input('name')),
            'email' => $user?->email ?? $request->input('email'),
            'phone' => $user?->phone ?? $request->input('phone'),
            'token' => $user === null ? ExamExaminer::newToken() : null,
        ]);

        $this->rooms->ensureExaminerRooms($examiner);

        $this->toast($user === null
            ? __('Examiner added. Copy their link and send it to them; it works on the exam day only.')
            : __('Examiner added.'));

        return back();
    }

    /**
     * Remove an examiner; their students go back to the pool to be shared again.
     */
    public function destroy(ExamExaminer $examiner): RedirectResponse
    {
        $this->authorize('update', $examiner->day->exam);

        $examiner->delete();

        $this->toast(__('Examiner removed. Share their students among the others.'));

        return back();
    }
}
