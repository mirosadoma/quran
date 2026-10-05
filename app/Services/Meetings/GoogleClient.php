<?php

namespace App\Services\Meetings;

use App\Exceptions\MeetingException;
use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;

/**
 * OAuth connection to the academy's Google account used to create Meet links.
 */
class GoogleClient
{
    protected const TOKEN_CACHE_KEY = 'google-meet-access-token';

    /**
     * @var list<string>
     */
    public const SCOPES = [
        'openid',
        'email',
        'https://www.googleapis.com/auth/meetings.space.created',
        'https://www.googleapis.com/auth/meetings.space.settings',
    ];

    public function hasCredentials(): bool
    {
        return filled(config('services.google.client_id')) && filled(config('services.google.client_secret'));
    }

    /**
     * @return array{email: string|null, refresh_token: string, connected_at: string}|null
     */
    public function connection(): ?array
    {
        $connection = Setting::get('google_meet');

        return is_array($connection) && filled($connection['refresh_token'] ?? null) ? $connection : null;
    }

    public function isConnected(): bool
    {
        return $this->hasCredentials() && $this->connection() !== null;
    }

    public function redirectUri(): string
    {
        return (string) (config('services.google.redirect') ?: route('settings.google.callback'));
    }

    public function authorizationUrl(string $state): string
    {
        return 'https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query([
            'client_id' => config('services.google.client_id'),
            'redirect_uri' => $this->redirectUri(),
            'response_type' => 'code',
            'scope' => implode(' ', self::SCOPES),
            'access_type' => 'offline',
            'prompt' => 'consent',
            'include_granted_scopes' => 'true',
            'state' => $state,
        ]);
    }

    /**
     * Exchange the authorization code and store the refresh token.
     *
     * @throws MeetingException
     */
    public function connect(string $code): ?string
    {
        $response = Http::asForm()->timeout(15)->post('https://oauth2.googleapis.com/token', [
            'code' => $code,
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'redirect_uri' => $this->redirectUri(),
            'grant_type' => 'authorization_code',
        ]);

        if ($response->failed()) {
            throw new MeetingException(__('Google rejected the connection: :error', [
                'error' => $response->json('error_description') ?? $response->json('error') ?? $response->status(),
            ]));
        }

        $refreshToken = $response->json('refresh_token');

        if (blank($refreshToken)) {
            throw new MeetingException(__('Google did not return a refresh token. Remove the app from your Google account permissions and connect again.'));
        }

        $email = $this->emailFromIdToken($response->json('id_token'));

        Setting::put(['google_meet' => [
            'email' => $email,
            'refresh_token' => Crypt::encryptString($refreshToken),
            'connected_at' => now()->toIso8601String(),
        ]]);

        Cache::put(
            self::TOKEN_CACHE_KEY,
            $response->json('access_token'),
            now()->addSeconds(max(60, (int) $response->json('expires_in', 3600) - 300)),
        );

        return $email;
    }

    public function disconnect(): void
    {
        $connection = $this->connection();

        if ($connection !== null) {
            rescue(fn () => Http::asForm()->timeout(10)->post('https://oauth2.googleapis.com/revoke', [
                'token' => Crypt::decryptString($connection['refresh_token']),
            ]), report: false);
        }

        Setting::put(['google_meet' => null]);
        Cache::forget(self::TOKEN_CACHE_KEY);
    }

    /**
     * A valid access token, refreshed when needed.
     *
     * @throws MeetingException
     */
    public function accessToken(): string
    {
        $connection = $this->connection();

        if ($connection === null || ! $this->hasCredentials()) {
            throw new MeetingException(__('Google Meet is not connected. Connect a Google account from the settings page.'));
        }

        return Cache::remember(self::TOKEN_CACHE_KEY, now()->addMinutes(50), function () use ($connection): string {
            $response = Http::asForm()->timeout(15)->post('https://oauth2.googleapis.com/token', [
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'refresh_token' => Crypt::decryptString($connection['refresh_token']),
                'grant_type' => 'refresh_token',
            ]);

            if ($response->failed()) {
                throw new MeetingException(__('The Google connection has expired. Please reconnect Google from the settings page.'));
            }

            return (string) $response->json('access_token');
        });
    }

    protected function emailFromIdToken(?string $idToken): ?string
    {
        $segments = explode('.', (string) $idToken);

        if (count($segments) < 2) {
            return null;
        }

        $payload = json_decode((string) base64_decode(strtr($segments[1], '-_', '+/')), true);

        return is_array($payload) ? ($payload['email'] ?? null) : null;
    }
}
