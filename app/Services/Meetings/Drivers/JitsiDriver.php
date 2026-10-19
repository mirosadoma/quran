<?php

namespace App\Services\Meetings\Drivers;

use App\Exceptions\MeetingException;
use App\Models\HalaqaSession;
use App\Models\User;
use App\Services\Meetings\JoinTarget;
use App\Services\Meetings\MeetingDetails;
use App\Services\Meetings\MeetingDriver;
use Firebase\JWT\JWT;
use Illuminate\Support\Str;

/**
 * Jitsi Meet: the free public server (meet.jit.si), 8x8 JaaS, or a self-hosted server.
 */
class JitsiDriver implements MeetingDriver
{
    public function mode(): string
    {
        return (string) config('meetings.jitsi.mode', 'public');
    }

    public function isEmbedded(): bool
    {
        return in_array($this->mode(), ['jaas', 'self_hosted'], true);
    }

    public function isConfigured(): bool
    {
        return match ($this->mode()) {
            'jaas' => filled(config('meetings.jitsi.jaas.app_id'))
                && filled(config('meetings.jitsi.jaas.api_key_id'))
                && is_file($this->privateKeyPath()),
            'self_hosted' => filled(config('meetings.jitsi.domain')),
            default => true,
        };
    }

    public function create(HalaqaSession $session): MeetingDetails
    {
        $room = $this->newRoomName((string) $session->halaqa_id);

        return new MeetingDetails(id: $room, url: $this->roomUrl($room), data: ['mode' => $this->mode()]);
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
        return $this->joinTargetForRoom((string) $session->meeting_id, $this->participant($user), $session->isManagedBy($user));
    }

    /**
     * A new, hard to guess room name with the given tag in it.
     */
    public function newRoomName(string $tag): string
    {
        return Str::lower(Str::slug((string) config('app.name')).'-'.Str::slug($tag).'-'.Str::random(12));
    }

    /**
     * The participant description sent to Jitsi for a user of the platform.
     *
     * @return array{id: string, name: string, email: string|null, avatar: string|null, locale: string}
     */
    public function participant(User $user): array
    {
        return [
            'id' => (string) $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'avatar' => $user->avatar_url,
            'locale' => $user->preferredLocale(),
        ];
    }

    /**
     * Where a participant goes to enter any room of this server (used by sessions and exams).
     *
     * @param  array{id: string, name: string, email?: string|null, avatar?: string|null, locale?: string}  $participant
     *
     * @throws MeetingException
     */
    public function joinTargetForRoom(string $room, array $participant, bool $moderator): JoinTarget
    {
        if (! $this->isConfigured()) {
            throw new MeetingException(__('Jitsi is not configured correctly. Check the JaaS keys in the .env file.'));
        }

        return match ($this->mode()) {
            'jaas' => JoinTarget::embed([
                'provider' => 'jaas',
                'appId' => config('meetings.jitsi.jaas.app_id'),
                'roomName' => $room,
                'jwt' => $this->jaasToken($room, $participant, $moderator),
            ]),
            'self_hosted' => JoinTarget::embed([
                'provider' => 'jitsi',
                'domain' => config('meetings.jitsi.domain'),
                'roomName' => $room,
                'jwt' => $this->selfHostedToken($room, $participant, $moderator),
            ]),
            default => JoinTarget::redirect($this->publicJoinUrl($room, $participant['name'], $participant['locale'] ?? app()->getLocale())),
        };
    }

    /**
     * The address of a room on the public server, with the participant's name and language set.
     */
    public function publicJoinUrl(string $room, string $displayName, string $locale): string
    {
        return $this->roomUrl($room).'#'.implode('&', [
            'userInfo.displayName='.rawurlencode((string) json_encode($displayName, JSON_UNESCAPED_UNICODE)),
            'config.defaultLanguage='.rawurlencode((string) json_encode($locale)),
            'config.disableDeepLinking=true',
        ]);
    }

    public function roomUrl(string $room): string
    {
        if ($this->mode() === 'jaas') {
            return 'https://8x8.vc/'.config('meetings.jitsi.jaas.app_id').'/'.$room;
        }

        return 'https://'.config('meetings.jitsi.domain', 'meet.jit.si').'/'.$room;
    }

    protected function privateKeyPath(): string
    {
        $path = (string) config('meetings.jitsi.jaas.private_key_path');

        return Str::startsWith($path, ['/', '\\']) || preg_match('/^[A-Za-z]:/', $path) === 1 ? $path : base_path($path);
    }

    /**
     * JWT signed with the JaaS private key (RS256).
     *
     * @param  array{id: string, name: string, email?: string|null, avatar?: string|null}  $participant
     */
    protected function jaasToken(string $room, array $participant, bool $moderator): string
    {
        $now = now()->timestamp;

        $payload = [
            'aud' => 'jitsi',
            'iss' => 'chat',
            'sub' => config('meetings.jitsi.jaas.app_id'),
            'room' => $room,
            'iat' => $now,
            'nbf' => $now - 10,
            'exp' => $now + 4 * 3600,
            'context' => [
                'user' => array_filter([
                    'id' => $participant['id'],
                    'name' => $participant['name'],
                    'email' => $participant['email'] ?? null,
                    'avatar' => $participant['avatar'] ?? null,
                    'moderator' => $moderator ? 'true' : 'false',
                ], fn ($value): bool => $value !== null),
                'features' => [
                    'livestreaming' => false,
                    'recording' => $moderator,
                    'transcription' => false,
                    'outbound-call' => false,
                    'sip-outbound-call' => false,
                ],
            ],
        ];

        return JWT::encode(
            $payload,
            (string) file_get_contents($this->privateKeyPath()),
            'RS256',
            (string) config('meetings.jitsi.jaas.api_key_id'),
        );
    }

    /**
     * JWT for a self-hosted server using token authentication (HS256), if enabled.
     *
     * @param  array{id: string, name: string, email?: string|null, avatar?: string|null}  $participant
     */
    protected function selfHostedToken(string $room, array $participant, bool $moderator): ?string
    {
        $appId = config('meetings.jitsi.app_id');
        $secret = config('meetings.jitsi.app_secret');

        if (blank($appId) || blank($secret)) {
            return null;
        }

        $now = now()->timestamp;

        return JWT::encode([
            'aud' => $appId,
            'iss' => $appId,
            'sub' => config('meetings.jitsi.domain'),
            'room' => $room,
            'nbf' => $now - 10,
            'exp' => $now + 4 * 3600,
            'moderator' => $moderator,
            'context' => [
                'user' => array_filter([
                    'id' => $participant['id'],
                    'name' => $participant['name'],
                    'email' => $participant['email'] ?? null,
                    'avatar' => $participant['avatar'] ?? null,
                    'moderator' => $moderator,
                ], fn ($value): bool => $value !== null),
            ],
        ], (string) $secret, 'HS256');
    }
}
