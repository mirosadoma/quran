<?php

namespace App\Policies;

use App\Models\ProgressRecord;
use App\Models\User;

class ProgressRecordPolicy
{
    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, ProgressRecord $progressRecord): bool
    {
        if ($user->managesAcademy($progressRecord->halaqa?->academy_id ?? $progressRecord->student?->academy_id)) {
            return true;
        }

        return $user->isTeacher()
            && ($progressRecord->teacher_id === $user->id || $progressRecord->halaqa?->teacher_id === $user->id);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, ProgressRecord $progressRecord): bool
    {
        return $this->update($user, $progressRecord);
    }
}
