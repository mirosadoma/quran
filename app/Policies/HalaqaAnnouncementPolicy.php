<?php

namespace App\Policies;

use App\Models\HalaqaAnnouncement;
use App\Models\User;

class HalaqaAnnouncementPolicy
{
    /**
     * Determine whether the user can update the model: the halaqa teacher or an admin,
     * while nothing was delivered yet.
     */
    public function update(User $user, HalaqaAnnouncement $halaqaAnnouncement): bool
    {
        return $halaqaAnnouncement->isPending() && $this->manages($user, $halaqaAnnouncement);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, HalaqaAnnouncement $halaqaAnnouncement): bool
    {
        return $this->manages($user, $halaqaAnnouncement);
    }

    protected function manages(User $user, HalaqaAnnouncement $halaqaAnnouncement): bool
    {
        return $halaqaAnnouncement->halaqa !== null && $user->can('manage', $halaqaAnnouncement->halaqa);
    }
}
