<?php

namespace App\Services\Meetings;

/**
 * Where a user goes to take part in a meeting: an external URL or a
 * meeting embedded inside the platform.
 */
final class JoinTarget
{
    /**
     * @param  array<string, mixed>  $embed
     */
    public function __construct(
        public string $type,
        public ?string $url = null,
        public array $embed = [],
    ) {}

    public static function redirect(string $url): self
    {
        return new self('redirect', $url);
    }

    /**
     * @param  array<string, mixed>  $config
     */
    public static function embed(array $config): self
    {
        return new self('embed', null, $config);
    }

    public function isEmbedded(): bool
    {
        return $this->type === 'embed';
    }
}
