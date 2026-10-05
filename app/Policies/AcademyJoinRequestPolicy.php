<?php

namespace App\Policies;

use App\Models\AcademyJoinRequest;
use App\Models\User;

class AcademyJoinRequestPolicy
{
    /**
     * Accept or decline: the manager of the academy, or the administration.
     */
    public function decide(User $user, AcademyJoinRequest $joinRequest): bool
    {
        return $joinRequest->isPending() && $user->managesAcademy($joinRequest->academy_id);
    }

    /**
     * Withdraw: the student who sent it, while it waits.
     */
    public function cancel(User $user, AcademyJoinRequest $joinRequest): bool
    {
        return $joinRequest->isPending() && $joinRequest->user_id === $user->id;
    }
}
