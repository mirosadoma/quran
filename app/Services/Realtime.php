<?php

namespace App\Services;

/**
 * Broadcasting status (Laravel Reverb, the platform's own WebSocket server) and the public
 * settings the browser needs to connect.
 */
class Realtime
{
    public static function driver(): string
    {
        return (string) config('broadcasting.default');
    }

    public static function enabled(): bool
    {
        return static::driver() === 'reverb' && filled(config('broadcasting.connections.reverb.key'));
    }

    /**
     * Public (non-secret) connection settings for Laravel Echo.
     *
     * @return array<string, mixed>
     */
    public static function clientConfig(): array
    {
        if (! static::enabled()) {
            return ['enabled' => false];
        }

        $options = config('broadcasting.connections.reverb.options');

        return [
            'enabled' => true,
            'broadcaster' => 'reverb',
            'key' => config('broadcasting.connections.reverb.key'),
            'host' => $options['host'] ?? request()->getHost(),
            'port' => (int) ($options['port'] ?? 443),
            'scheme' => $options['scheme'] ?? 'https',
        ];
    }
}
