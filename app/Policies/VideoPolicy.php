<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Video;

class VideoPolicy
{
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
    public function update(User $user, Video $video): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        // The manager of the academy whose library or halaqa holds it (not the platform's library).
        $academyId = $video->academy_id ?? $video->halaqa?->academy_id;

        if ($user->isManager() && $academyId !== null) {
            return $academyId === $user->academy_id;
        }

        return $user->isTeacher()
            && ($video->created_by === $user->id || ($video->halaqa !== null && $video->halaqa->teacher_id === $user->id));
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Video $video): bool
    {
        return $this->update($user, $video);
    }
}
