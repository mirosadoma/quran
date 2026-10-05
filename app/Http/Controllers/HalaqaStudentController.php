<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Halaqa;
use App\Models\User;
use App\Notifications\AddedToHalaqa;
use App\Services\Notifier;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class HalaqaStudentController extends Controller
{
    public function __construct(protected Notifier $notifier) {}

    /**
     * Add students to the halaqa.
     */
    public function store(Request $request, Halaqa $halaqa): RedirectResponse
    {
        $this->authorize('update', $halaqa);

        $validated = $request->validate([
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['integer', Rule::exists('users', 'id')->where('role', UserRole::Student->value)],
        ]);

        $current = $halaqa->students()->pluck('users.id');
        $newIds = collect($validated['student_ids'])->map(fn ($id): int => (int) $id)->diff($current)->values();

        if ($halaqa->capacity !== null && $current->count() + $newIds->count() > $halaqa->capacity) {
            throw ValidationException::withMessages([
                'student_ids' => __('The halaqa capacity is :capacity students.', ['capacity' => $halaqa->capacity]),
            ]);
        }

        $students = User::query()->whereIn('id', $newIds)->get();
        $mismatched = $students->reject(fn (User $student): bool => $halaqa->gender->accepts($student->gender));

        if ($mismatched->isNotEmpty()) {
            throw ValidationException::withMessages([
                'student_ids' => __('These students do not match the halaqa category: :names', [
                    'names' => $mismatched->pluck('name')->implode('، '),
                ]),
            ]);
        }

        $halaqa->students()->attach($newIds->all());
        $halaqa->loadMissing('teacher');
        $this->notifier->send($students, new AddedToHalaqa($halaqa));

        $this->toast(__(':count students added to the halaqa.', ['count' => $newIds->count()]));

        return back();
    }

    /**
     * Remove a student from the halaqa.
     */
    public function destroy(Halaqa $halaqa, User $student): RedirectResponse
    {
        $this->authorize('update', $halaqa);

        $halaqa->students()->detach($student->id);

        $this->toast(__('Student removed from the halaqa.'));

        return back();
    }
}
