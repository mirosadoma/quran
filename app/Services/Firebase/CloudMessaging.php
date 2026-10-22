<?php

namespace App\Services\Firebase;

use App\Models\PushSubscription;
use Firebase\JWT\JWT;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

/**
 * Sends push notifications to browsers and installed apps through Firebase Cloud Messaging
 * (HTTP v1 API), signed in with the service account of the Firebase project.
 *
 * The browser gets its token from Firebase with the web values of the project (none of them is
 * secret); the server only needs the service account file. See config/services.php.
 */
class CloudMessaging
{
    protected const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    protected const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

    /**
     * Errors meaning a device token will never work again: the app was removed, the token
     * expired, or it belongs to another Firebase project.
     */
    protected const STALE_TOKEN_ERRORS = ['UNREGISTERED', 'SENDER_ID_MISMATCH'];

    public function isConfigured(): bool
    {
        return $this->credentials() !== null
            && filled(config('services.firebase.api_key'))
            && filled(config('services.firebase.app_id'))
            && filled(config('services.firebase.messaging_sender_id'))
            && filled(config('services.firebase.vapid_key'));
    }

    /**
     * What the browser needs to get its token from Firebase.
     *
     * @return array{apiKey: string, projectId: string, appId: string, messagingSenderId: string, vapidKey: string}|null
     */
    public function webConfig(): ?array
    {
        if (! $this->isConfigured()) {
            return null;
        }

        return [
            'apiKey' => (string) config('services.firebase.api_key'),
            'projectId' => $this->credentials()['project_id'],
            'appId' => (string) config('services.firebase.app_id'),
            'messagingSenderId' => (string) config('services.firebase.messaging_sender_id'),
            'vapidKey' => (string) config('services.firebase.vapid_key'),
        ];
    }

    /**
     * Deliver a payload to one device. It goes as a data message (Firebase only accepts strings
     * there), and the service worker of the platform shows it.
     *
     * @param  array<string, mixed>  $payload
     */
    public function send(PushSubscription $subscription, array $payload, int $ttl = 86400, string $urgency = 'normal'): Response
    {
        return Http::connectTimeout(5)
            ->timeout(15)
            ->withToken($this->accessToken())
            ->post("https://fcm.googleapis.com/v1/projects/{$this->credentials()['project_id']}/messages:send", [
                'message' => [
                    'token' => $subscription->token,
                    'data' => ['payload' => (string) json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)],
                    'webpush' => ['headers' => ['TTL' => (string) $ttl, 'Urgency' => $urgency]],
                ],
            ]);
    }

    /**
     * Whether Firebase answered that the device token will never work again.
     */
    public function isStaleToken(Response $response): bool
    {
        return collect($response->json('error.details', []))
            ->pluck('errorCode')
            ->intersect(self::STALE_TOKEN_ERRORS)
            ->isNotEmpty();
    }

    /**
     * Sign in with the service account (OAuth 2 JWT bearer grant). Google's tokens last an hour;
     * one is kept for 50 minutes.
     */
    protected function accessToken(): string
    {
        $credentials = $this->credentials();

        return Cache::remember('firebase-access-token:'.$credentials['client_email'], now()->addMinutes(50), function () use ($credentials): string {
            $now = time();

            $assertion = JWT::encode([
                'iss' => $credentials['client_email'],
                'scope' => self::SCOPE,
                'aud' => self::TOKEN_URL,
                'iat' => $now,
                'exp' => $now + 3600,
            ], $credentials['private_key'], 'RS256');

            return (string) Http::asForm()
                ->connectTimeout(5)
                ->timeout(15)
                ->post(self::TOKEN_URL, [
                    'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    'assertion' => $assertion,
                ])
                ->throw()
                ->json('access_token');
        });
    }

    /**
     * The service account of the Firebase project, or null when its file is missing or invalid.
     *
     * @return array{project_id: string, client_email: string, private_key: string}|null
     */
    protected function credentials(): ?array
    {
        return once(function (): ?array {
            $path = (string) config('services.firebase.credentials');

            if ($path !== '' && ! is_file($path)) {
                $path = base_path($path);
            }

            $account = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;

            if (! is_array($account) || ($account['type'] ?? null) !== 'service_account') {
                return null;
            }

            foreach (['project_id', 'client_email', 'private_key'] as $key) {
                if (! is_string($account[$key] ?? null) || $account[$key] === '') {
                    return null;
                }
            }

            return [
                'project_id' => $account['project_id'],
                'client_email' => $account['client_email'],
                'private_key' => $account['private_key'],
            ];
        });
    }
}
