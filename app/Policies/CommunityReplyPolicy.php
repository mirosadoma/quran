<?php

namespace App\Policies;

use App\Models\CommunityReply;
use App\Models\User;

class CommunityReplyPolicy
{
    /**
     * Determine whether the user can update the model: only the member who replied.
     */
    public function update(User $user, CommunityReply $communityReply): bool
    {
        return $communityReply->user_id === $user->id;
    }

    /**
     * Determine whether the user can delete the model: the member who replied, or the administration
     * (moderation).
     */
    public function delete(User $user, CommunityReply $communityReply): bool
    {
        return $communityReply->user_id === $user->id || $user->isAdmin();
    }

    /**
     * Determine whether the user can mark the reply as the accepted answer: the member who asked,
     * for an answer of a sheikh.
     */
    public function accept(User $user, CommunityReply $communityReply): bool
    {
        return $communityReply->is_answer && $communityReply->post?->user_id === $user->id;
    }
}
