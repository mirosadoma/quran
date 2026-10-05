<?php

namespace App\Policies;

use App\Models\Halaqa;
use App\Models\User;

class HalaqaPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Halaqa $halaqa): bool
    {
        return $halaqa->hasMember($user);
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
    public function update(User $user, Halaqa $halaqa): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Halaqa $halaqa): bool
    {
        return $user->isAdmin();
    }

    /**
     * Determine whether the user teaches or administers the halaqa.
     */
    public function manage(User $user, Halaqa $halaqa): bool
    {
        return $user->isAdmin() || ($user->isTeacher() && $halaqa->teacher_id === $user->id);
    }

    /**
     * Determine whether the user can take part in the halaqa chat.
     */
    public function chat(User $user, Halaqa $halaqa): bool
    {
        return $halaqa->hasMember($user);
    }
}
