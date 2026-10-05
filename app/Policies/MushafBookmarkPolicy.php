<?php

namespace App\Policies;

use App\Models\MushafBookmark;
use App\Models\User;

class MushafBookmarkPolicy
{
    /**
     * Determine whether the user can delete the model: bookmarks are personal.
     */
    public function delete(User $user, MushafBookmark $mushafBookmark): bool
    {
        return $mushafBookmark->user_id === $user->id;
    }
}
