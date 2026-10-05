<?php

namespace App\Policies;

use App\Models\HalaqaSession;
use App\Models\User;

class HalaqaSessionPolicy
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
    public function view(User $user, HalaqaSession $session): bool
    {
        return $session->isManagedBy($user) || ($user->isStudent() && $session->halaqa->hasMember($user));
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->managesAcademies() || $user->isTeacher();
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, HalaqaSession $session): bool
    {
        return $session->isManagedBy($user);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, HalaqaSession $session): bool
    {
        return $session->isManagedBy($user);
    }
}
