<?php

namespace App\Http\Controllers;

use App\Http\Requests\AttendanceRequest;
use App\Models\Attendance;
use App\Models\HalaqaSession;
use Illuminate\Http\RedirectResponse;

class AttendanceController extends Controller
{
    /**
     * Save the attendance sheet of a session.
     */
    public function update(AttendanceRequest $request, HalaqaSession $session): RedirectResponse
    {
        $allowed = $session->halaqa->students()->pluck('users.id')
            ->merge($session->attendances()->pluck('student_id'))
            ->map(fn ($id): int => (int) $id);

        foreach ($request->validated('attendances') as $row) {
            $studentId = (int) $row['student_id'];

            if (! $allowed->contains($studentId)) {
                continue;
            }

            if (blank($row['status'] ?? null)) {
                Attendance::query()->where('halaqa_session_id', $session->id)->where('student_id', $studentId)->delete();

                continue;
            }

            Attendance::query()->updateOrCreate(
                ['halaqa_session_id' => $session->id, 'student_id' => $studentId],
                ['status' => $row['status'], 'notes' => $row['notes'] ?? null, 'recorded_by' => $request->user()->id],
            );
        }

        $this->toast(__('Attendance saved.'));

        return back();
    }
}
