<?php

namespace App\Policies;

use App\Models\Halaqa;
use App\Models\User;

class UserPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, User $model): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, User $model): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, User $model): bool
    {
        return $user->isAdmin() && $user->id !== $model->id;
    }

    /**
     * Determine whether the user can see a student's progress and reports.
     */
    public function viewProgress(User $user, User $student): bool
    {
        if (! $student->isStudent()) {
            return false;
        }

        if ($user->isAdmin() || $user->id === $student->id) {
            return true;
        }

        return $this->teaches($user, $student);
    }

    /**
     * Determine whether the user can record progress for the student.
     */
    public function recordProgress(User $user, User $student): bool
    {
        return $student->isStudent() && ($user->isAdmin() || $this->teaches($user, $student));
    }

    protected function teaches(User $teacher, User $student): bool
    {
        return $teacher->isTeacher() && Halaqa::query()
            ->where('teacher_id', $teacher->id)
            ->whereHas('students', fn ($query) => $query->whereKey($student->id))
            ->exists();
    }
}
