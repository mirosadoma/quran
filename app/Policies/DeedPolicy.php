<?php

namespace App\Policies;

use App\Models\Deed;
use App\Models\User;

class DeedPolicy
{
    /**
     * Determine whether the user can update the model: deeds are private to their user.
     */
    public function update(User $user, Deed $deed): bool
    {
        return $deed->user_id === $user->id;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Deed $deed): bool
    {
        return $deed->user_id === $user->id;
    }
}
