<?php

namespace App\Services\WebPush;

use App\Models\PushSubscription;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use OpenSSLAsymmetricKey;
use RuntimeException;

/**
 * Sends push notifications to browsers and installed apps (Web Push), without any package:
 * the message is encrypted for the browser (RFC 8291, aes128gcm) and the request is signed
 * with the VAPID keys of the platform (RFC 8292) so the push service accepts it.
 *
 * Keys: `php artisan webpush:keys` writes VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to .env.
 */
class WebPush
{
    /**
     * DER prefix of a P-256 public key (SubjectPublicKeyInfo) before its 65-byte point.
     */
    protected const PUBLIC_KEY_PREFIX = '3059301306072a8648ce3d020106082a8648ce3d030107034200';

    public function isConfigured(): bool
    {
        return filled($this->publicKey()) && filled(config('services.webpush.private_key'));
    }

    /**
     * The key browsers need to subscribe (base64url, uncompressed P-256 point).
     */
    public function publicKey(): ?string
    {
        return config('services.webpush.public_key') ?: null;
    }

    /**
     * Deliver a payload to one subscription.
     *
     * @param  array<string, mixed>  $payload
     */
    public function send(PushSubscription $subscription, array $payload, int $ttl = 86400, string $urgency = 'normal'): Response
    {
        $body = $this->encrypt(
            (string) json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            $subscription->public_key,
            $subscription->auth_token,
        );

        return Http::timeout(15)
            ->withHeaders([
                'Authorization' => $this->vapidAuthorization($subscription->endpoint),
                'Content-Encoding' => 'aes128gcm',
                'TTL' => (string) $ttl,
                'Urgency' => $urgency,
            ])
            ->withBody($body, 'application/octet-stream')
            ->post($subscription->endpoint);
    }

    /**
     * Encrypt a message for a browser (RFC 8291). $localPrivateKey (base64url) and $salt are only
     * given by tests; otherwise a new key pair and salt are created for every message.
     */
    public function encrypt(string $plaintext, string $userPublicKey, string $userAuth, ?string $localPrivateKey = null, ?string $localPublicKey = null, ?string $salt = null): string
    {
        $uaPublic = static::base64UrlDecode($userPublicKey);
        $authSecret = static::base64UrlDecode($userAuth);

        if ($localPrivateKey !== null && $localPublicKey !== null) {
            $asPublic = static::base64UrlDecode($localPublicKey);
            $local = openssl_pkey_get_private(static::privateKeyPem(static::base64UrlDecode($localPrivateKey), $asPublic));
        } else {
            $local = static::newKey();
            $asPublic = static::publicPoint($local);
        }

        $peer = openssl_pkey_get_public(static::publicKeyPem($uaPublic));

        if (! $local instanceof OpenSSLAsymmetricKey || ! $peer instanceof OpenSSLAsymmetricKey) {
            throw new RuntimeException('Invalid push subscription keys.');
        }

        $sharedSecret = openssl_pkey_derive($peer, $local, 32);

        if ($sharedSecret === false) {
            throw new RuntimeException('Could not derive the push encryption secret: '.openssl_error_string());
        }

        $salt ??= random_bytes(16);
        $ikm = hash_hkdf('sha256', $sharedSecret, 32, "WebPush: info\0".$uaPublic.$asPublic, $authSecret);
        $contentKey = hash_hkdf('sha256', $ikm, 16, "Content-Encoding: aes128gcm\0", $salt);
        $nonce = hash_hkdf('sha256', $ikm, 12, "Content-Encoding: nonce\0", $salt);

        $tag = '';
        // A single record: the message followed by the padding delimiter 0x02.
        $ciphertext = openssl_encrypt($plaintext."\x02", 'aes-128-gcm', $contentKey, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);

        return $salt.pack('N', 4096).chr(strlen($asPublic)).$asPublic.$ciphertext.$tag;
    }

    /**
     * The VAPID Authorization header for a push service (a JWT signed with ES256).
     */
    public function vapidAuthorization(string $endpoint, ?int $expiresAt = null): string
    {
        $parts = parse_url($endpoint);
        $audience = ($parts['scheme'] ?? 'https').'://'.($parts['host'] ?? '').(isset($parts['port']) ? ':'.$parts['port'] : '');

        $header = static::base64UrlEncode((string) json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
        $claims = static::base64UrlEncode((string) json_encode([
            'aud' => $audience,
            'exp' => $expiresAt ?? time() + 12 * 3600,
            'sub' => $this->subject(),
        ], JSON_UNESCAPED_SLASHES));

        $publicPoint = static::base64UrlDecode((string) $this->publicKey());
        $privateKey = openssl_pkey_get_private(static::privateKeyPem(static::base64UrlDecode((string) config('services.webpush.private_key')), $publicPoint));

        if (! $privateKey instanceof OpenSSLAsymmetricKey || ! openssl_sign("{$header}.{$claims}", $signature, $privateKey, OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Invalid VAPID keys. Run php artisan webpush:keys.');
        }

        $token = "{$header}.{$claims}.".static::base64UrlEncode(static::derToRawSignature($signature));

        return "vapid t={$token}, k={$this->publicKey()}";
    }

    /**
     * Who to contact about these notifications (required by the push services).
     */
    protected function subject(): string
    {
        $subject = config('services.webpush.subject');

        if (filled($subject)) {
            return $subject;
        }

        return 'mailto:'.(config('mail.from.address') ?: 'admin@example.com');
    }

    /**
     * A new VAPID key pair, base64url encoded.
     *
     * @return array{public_key: string, private_key: string}
     */
    public static function generateKeys(): array
    {
        $key = static::newKey();
        $details = openssl_pkey_get_details($key);

        return [
            'public_key' => static::base64UrlEncode(static::publicPoint($key)),
            'private_key' => static::base64UrlEncode(str_pad($details['ec']['d'], 32, "\0", STR_PAD_LEFT)),
        ];
    }

    /**
     * A new P-256 key. On Windows PHP needs its bundled openssl.cnf for that.
     */
    protected static function newKey(): OpenSSLAsymmetricKey
    {
        $options = ['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC];
        $key = openssl_pkey_new($options);

        foreach ([getenv('OPENSSL_CONF') ?: null, dirname(PHP_BINARY).'/extras/ssl/openssl.cnf'] as $config) {
            if ($key instanceof OpenSSLAsymmetricKey) {
                break;
            }

            if ($config !== null && is_file($config)) {
                $key = openssl_pkey_new([...$options, 'config' => $config]);
            }
        }

        if (! $key instanceof OpenSSLAsymmetricKey) {
            throw new RuntimeException('OpenSSL could not create a P-256 key: '.openssl_error_string());
        }

        return $key;
    }

    /**
     * The uncompressed public point (0x04 || X || Y) of a key.
     */
    protected static function publicPoint(OpenSSLAsymmetricKey $key): string
    {
        $ec = openssl_pkey_get_details($key)['ec'];

        return "\x04".str_pad($ec['x'], 32, "\0", STR_PAD_LEFT).str_pad($ec['y'], 32, "\0", STR_PAD_LEFT);
    }

    public static function publicKeyPem(string $point): string
    {
        $der = hex2bin(self::PUBLIC_KEY_PREFIX).$point;

        return "-----BEGIN PUBLIC KEY-----\n".chunk_split(base64_encode($der), 64, "\n")."-----END PUBLIC KEY-----\n";
    }

    /**
     * SEC1 private key from the raw scalar and its public point.
     */
    public static function privateKeyPem(string $secret, string $point): string
    {
        $der = "\x30\x77\x02\x01\x01\x04\x20".str_pad($secret, 32, "\0", STR_PAD_LEFT)
            ."\xa0\x0a\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07"
            ."\xa1\x44\x03\x42\x00".$point;

        return "-----BEGIN EC PRIVATE KEY-----\n".chunk_split(base64_encode($der), 64, "\n")."-----END EC PRIVATE KEY-----\n";
    }

    /**
     * ECDSA signatures come as DER (SEQUENCE of two INTEGERs); JWT needs R || S, 32 bytes each.
     */
    public static function derToRawSignature(string $der): string
    {
        $offset = 2;

        if ((ord($der[1]) & 0x80) !== 0) {
            $offset += ord($der[1]) & 0x7F;
        }

        $integers = [];

        for ($i = 0; $i < 2; $i++) {
            $length = ord($der[$offset + 1]);
            $value = substr($der, $offset + 2, $length);
            $integers[] = str_pad(ltrim($value, "\0"), 32, "\0", STR_PAD_LEFT);
            $offset += 2 + $length;
        }

        return $integers[0].$integers[1];
    }

    public static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    public static function base64UrlDecode(string $data): string
    {
        $data = preg_replace('/\s+/', '', $data) ?? $data;

        return (string) base64_decode(strtr($data, '-_', '+/').str_repeat('=', (4 - strlen($data) % 4) % 4));
    }
}
