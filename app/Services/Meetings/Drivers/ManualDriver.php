<?php

namespace App\Services\Meetings\Drivers;

use App\Exceptions\MeetingException;
use App\Models\HalaqaSession;
use App\Models\User;
use App\Services\Meetings\JoinTarget;
use App\Services\Meetings\MeetingDetails;
use App\Services\Meetings\MeetingDriver;

/**
 * Uses a link pasted by the admin or teacher (Google Meet, Zoom, Teams...).
 */
class ManualDriver implements MeetingDriver
{
    public function isConfigured(): bool
    {
        return true;
    }

    public function create(HalaqaSession $session): MeetingDetails
    {
        return new MeetingDetails(url: $session->meeting_url ?: $session->halaqa?->meeting_url);
    }

    public function update(HalaqaSession $session): void
    {
        //
    }

    public function delete(HalaqaSession $session): void
    {
        //
    }

    public function end(HalaqaSession $session): void
    {
        //
    }

    public function joinTarget(HalaqaSession $session, User $user): JoinTarget
    {
        $url = $session->meeting_url ?: $session->halaqa?->meeting_url;

        if (blank($url)) {
            throw new MeetingException(__('No meeting link has been added for this session yet.'));
        }

        return JoinTarget::redirect($url);
    }
}
