<?php

namespace App\Policies;

use App\Enums\UserRole;
use App\Models\Halaqa;
use App\Models\User;

class UserPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->managesAcademies();
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, User $model): bool
    {
        return $this->manages($user, $model) || $user->is($model);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->managesAcademies();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, User $model): bool
    {
        return $this->manages($user, $model);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, User $model): bool
    {
        return $this->manages($user, $model) && $user->id !== $model->id;
    }

    /**
     * Determine whether the user can see a student's progress and reports.
     */
    public function viewProgress(User $user, User $student): bool
    {
        if (! $student->isStudent()) {
            return false;
        }

        if ($this->manages($user, $student) || $user->id === $student->id) {
            return true;
        }

        return $this->teaches($user, $student);
    }

    /**
     * Determine whether the user can record progress for the student.
     */
    public function recordProgress(User $user, User $student): bool
    {
        return $student->isStudent() && ($this->manages($user, $student) || $this->teaches($user, $student));
    }

    /**
     * The administration manages every account; an academy manager the teachers and students of
     * their academy.
     */
    protected function manages(User $user, User $model): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $user->isManager()
            && $user->academy_id !== null
            && $model->academy_id === $user->academy_id
            && $model->hasRole(UserRole::Teacher, UserRole::Student);
    }

    protected function teaches(User $teacher, User $student): bool
    {
        return $teacher->isTeacher() && Halaqa::query()
            ->where('teacher_id', $teacher->id)
            ->whereHas('students', fn ($query) => $query->whereKey($student->id))
            ->exists();
    }
}
