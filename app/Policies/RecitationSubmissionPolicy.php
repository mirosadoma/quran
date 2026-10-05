<?php

namespace App\Policies;

use App\Models\RecitationSubmission;
use App\Models\User;

class RecitationSubmissionPolicy
{
    /**
     * Determine whether the user can delete the model: the student withdraws it,
     * or the teacher of the halaqa dismisses it.
     */
    public function delete(User $user, RecitationSubmission $recitationSubmission): bool
    {
        if ($user->managesAcademy($recitationSubmission->halaqa?->academy_id) || $recitationSubmission->student_id === $user->id) {
            return true;
        }

        return $user->isTeacher() && $recitationSubmission->halaqa?->teacher_id === $user->id;
    }
}
