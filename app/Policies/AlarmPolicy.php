<?php

namespace App\Policies;

use App\Models\Alarm;
use App\Models\User;

class AlarmPolicy
{
    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Alarm $alarm): bool
    {
        return $alarm->user_id === $user->id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Alarm $alarm): bool
    {
        return $alarm->user_id === $user->id;
    }
}
