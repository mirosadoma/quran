<?php

namespace App\Services\Meetings\Drivers;

use App\Exceptions\MeetingException;
use App\Models\HalaqaSession;
use App\Models\User;
use App\Services\Meetings\GoogleClient;
use App\Services\Meetings\JoinTarget;
use App\Services\Meetings\MeetingDetails;
use App\Services\Meetings\MeetingDriver;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;

/**
 * Google Meet spaces created with the academy's Google account through the
 * Meet REST API. Spaces are OPEN so students join without knocking.
 */
class GoogleMeetDriver implements MeetingDriver
{
    protected const API = 'https://meet.googleapis.com/v2';

    public function __construct(protected GoogleClient $google) {}

    public function isConfigured(): bool
    {
        return $this->google->isConnected();
    }

    public function create(HalaqaSession $session): MeetingDetails
    {
        $response = $this->api()->post(self::API.'/spaces', [
            'config' => ['accessType' => 'OPEN', 'entryPointAccess' => 'ALL'],
        ]);

        if ($response->failed()) {
            $response = $this->api()->withBody('{}', 'application/json')->post(self::API.'/spaces');
        }

        if ($response->failed()) {
            throw new MeetingException(__('Google Meet could not create the meeting: :error', [
                'error' => $response->json('error.message') ?? $response->status(),
            ]));
        }

        return new MeetingDetails(
            id: $response->json('name'),
            url: $response->json('meetingUri'),
            data: ['code' => $response->json('meetingCode')],
        );
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
        if (filled($session->meeting_id) && $this->isConfigured()) {
            $this->api()->withBody('{}', 'application/json')
                ->post(self::API."/{$session->meeting_id}:endActiveConference");
        }
    }

    public function joinTarget(HalaqaSession $session, User $user): JoinTarget
    {
        if (blank($session->meeting_url)) {
            throw new MeetingException(__('The meeting link is not ready yet.'));
        }

        return JoinTarget::redirect($session->meeting_url);
    }

    protected function api(): PendingRequest
    {
        return Http::withToken($this->google->accessToken())->acceptJson()->timeout(20);
    }
}
