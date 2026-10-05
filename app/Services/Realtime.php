<?php

namespace App\Services;

/**
 * Broadcasting status and the public settings the browser needs to connect.
 */
class Realtime
{
    public static function driver(): string
    {
        return (string) config('broadcasting.default');
    }

    public static function enabled(): bool
    {
        $driver = static::driver();

        return in_array($driver, ['pusher', 'reverb'], true)
            && filled(config("broadcasting.connections.{$driver}.key"));
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

        $driver = static::driver();
        $connection = config("broadcasting.connections.{$driver}");

        if ($driver === 'reverb') {
            return [
                'enabled' => true,
                'broadcaster' => 'reverb',
                'key' => $connection['key'],
                'host' => $connection['options']['host'] ?? request()->getHost(),
                'port' => (int) ($connection['options']['port'] ?? 443),
                'scheme' => $connection['options']['scheme'] ?? 'https',
            ];
        }

        return [
            'enabled' => true,
            'broadcaster' => 'pusher',
            'key' => $connection['key'],
            'cluster' => $connection['options']['cluster'] ?? 'mt1',
        ];
    }
}
