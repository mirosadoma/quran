<?php

namespace App\Services\Meetings\Drivers;

use App\Exceptions\MeetingException;
use App\Models\HalaqaSession;
use App\Models\User;
use App\Services\Meetings\JoinTarget;
use App\Services\Meetings\MeetingDetails;
use App\Services\Meetings\MeetingDriver;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Zoom meetings created through a Server-to-Server OAuth app.
 */
class ZoomDriver implements MeetingDriver
{
    protected const TOKEN_CACHE_KEY = 'zoom-access-token';

    public function isConfigured(): bool
    {
        return filled(config('services.zoom.account_id'))
            && filled(config('services.zoom.client_id'))
            && filled(config('services.zoom.client_secret'));
    }

    public function create(HalaqaSession $session): MeetingDetails
    {
        $userId = $session->teacher?->zoom_user_id ?: 'me';

        $response = $this->api()->post("/users/{$userId}/meetings", [
            ...$this->schedulePayload($session),
            'type' => 2,
            'settings' => [
                'join_before_host' => true,
                'jbh_time' => 15,
                'waiting_room' => false,
                'mute_upon_entry' => true,
                'host_video' => true,
                'participant_video' => true,
                'approval_type' => 2,
                'auto_recording' => 'none',
            ],
        ]);

        $this->ensureSuccessful($response, __('Zoom could not create the meeting'));

        return new MeetingDetails(
            id: (string) $response->json('id'),
            url: $response->json('join_url'),
            password: $response->json('password'),
            data: ['host_id' => $response->json('host_id')],
        );
    }

    public function update(HalaqaSession $session): void
    {
        if (filled($session->meeting_id)) {
            $this->api()->patch("/meetings/{$session->meeting_id}", $this->schedulePayload($session));
        }
    }

    public function delete(HalaqaSession $session): void
    {
        if (filled($session->meeting_id)) {
            $this->api()->delete("/meetings/{$session->meeting_id}");
        }
    }

    public function end(HalaqaSession $session): void
    {
        if (filled($session->meeting_id)) {
            $this->api()->put("/meetings/{$session->meeting_id}/status", ['action' => 'end']);
        }
    }

    public function joinTarget(HalaqaSession $session, User $user): JoinTarget
    {
        if ($session->isManagedBy($user) && filled($session->meeting_id)) {
            $response = $this->api()->get("/meetings/{$session->meeting_id}");

            if ($response->successful() && filled($response->json('start_url'))) {
                return JoinTarget::redirect($response->json('start_url'));
            }
        }

        if (blank($session->meeting_url)) {
            throw new MeetingException(__('The meeting link is not ready yet.'));
        }

        return JoinTarget::redirect($session->meeting_url);
    }

    /**
     * @return array{topic: string, start_time: string, duration: int, timezone: string}
     */
    protected function schedulePayload(HalaqaSession $session): array
    {
        return [
            'topic' => Str::limit($session->displayTitle(), 190),
            'start_time' => $session->starts_at->copy()->utc()->format('Y-m-d\TH:i:s\Z'),
            'duration' => $session->duration_minutes,
            'timezone' => 'UTC',
        ];
    }

    protected function api(): PendingRequest
    {
        if (! $this->isConfigured()) {
            throw new MeetingException(__('Zoom is not configured. Add the Zoom keys to the .env file.'));
        }

        return Http::withToken($this->accessToken())
            ->acceptJson()
            ->timeout(20)
            ->baseUrl('https://api.zoom.us/v2');
    }

    protected function accessToken(): string
    {
        return Cache::remember(self::TOKEN_CACHE_KEY, now()->addMinutes(50), function (): string {
            $response = Http::asForm()
                ->withBasicAuth((string) config('services.zoom.client_id'), (string) config('services.zoom.client_secret'))
                ->timeout(15)
                ->post('https://zoom.us/oauth/token', [
                    'grant_type' => 'account_credentials',
                    'account_id' => config('services.zoom.account_id'),
                ]);

            $this->ensureSuccessful($response, __('Could not connect to Zoom'));

            return (string) $response->json('access_token');
        });
    }

    protected function ensureSuccessful(Response $response, string $message): void
    {
        if ($response->successful()) {
            return;
        }

        $reason = $response->json('message') ?? $response->json('reason') ?? $response->json('error') ?? $response->status();

        throw new MeetingException("{$message}: {$reason}");
    }
}
