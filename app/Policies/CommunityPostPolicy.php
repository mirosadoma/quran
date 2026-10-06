<?php

namespace App\Policies;

use App\Models\CommunityPost;
use App\Models\User;

class CommunityPostPolicy
{
    /**
     * Determine whether the user can update the model: only the member who asked.
     */
    public function update(User $user, CommunityPost $communityPost): bool
    {
        return $communityPost->user_id === $user->id;
    }

    /**
     * Determine whether the user can delete the model: the member who asked, or the administration
     * (moderation).
     */
    public function delete(User $user, CommunityPost $communityPost): bool
    {
        return $communityPost->user_id === $user->id || $user->isAdmin();
    }
}
