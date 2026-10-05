<?php

namespace App\Policies;

use App\Models\Message;
use App\Models\User;

class MessagePolicy
{
    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Message $message): bool
    {
        return $user->managesAcademy($message->halaqa?->academy_id)
            || $message->user_id === $user->id
            || ($user->isTeacher() && $message->halaqa?->teacher_id === $user->id);
    }
}
