<?php

namespace App\Policies;

use App\Models\Academy;
use App\Models\User;

/**
 * Academies are created and run on the platform by the administration; a manager edits the
 * profile of their own academy.
 */
class AcademyPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isAdmin();
    }

    public function view(User $user, Academy $academy): bool
    {
        return $user->managesAcademy($academy->id);
    }

    public function create(User $user): bool
    {
        return $user->isAdmin();
    }

    public function update(User $user, Academy $academy): bool
    {
        return $user->managesAcademy($academy->id);
    }

    /**
     * Activate, deactivate, archive and restore.
     */
    public function administer(User $user, Academy $academy): bool
    {
        return $user->isAdmin();
    }

    public function forceDelete(User $user, Academy $academy): bool
    {
        return $user->isAdmin() && $academy->trashed();
    }

    /**
     * Enter the academy with the account of its manager.
     */
    public function impersonate(User $user, Academy $academy): bool
    {
        return $user->isAdmin() && ! $academy->trashed();
    }
}
