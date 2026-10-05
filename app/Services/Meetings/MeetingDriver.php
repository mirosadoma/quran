<?php

namespace App\Services\Meetings;

use App\Exceptions\MeetingException;
use App\Models\HalaqaSession;
use App\Models\User;

interface MeetingDriver
{
    /**
     * Determine whether the provider has everything it needs to work.
     */
    public function isConfigured(): bool;

    /**
     * Create the external meeting for the session.
     *
     * @throws MeetingException
     */
    public function create(HalaqaSession $session): MeetingDetails;

    /**
     * Sync the external meeting after the session was rescheduled.
     */
    public function update(HalaqaSession $session): void;

    /**
     * Remove the external meeting (cancelled or deleted session).
     */
    public function delete(HalaqaSession $session): void;

    /**
     * End the live conference when the teacher closes the session.
     */
    public function end(HalaqaSession $session): void;

    /**
     * Resolve where the user should be sent to take part in the meeting.
     *
     * @throws MeetingException
     */
    public function joinTarget(HalaqaSession $session, User $user): JoinTarget;
}
