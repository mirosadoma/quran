<?php

namespace App\Services;

use App\Enums\DeedKind;
use App\Enums\SinSeverity;
use Illuminate\Support\Facades\Cache;

/**
 * The common sins and good deeds of resources/data/deeds.json: their names, whether a sin is
 * major or minor, and how to repent. The page suggests an entry while the user types; the server
 * only checks that the chosen entry exists and takes its severity from here.
 */
class DeedCatalog
{
    /**
     * @return array{sins: list<array<string, mixed>>, good: list<array<string, mixed>>}
     */
    protected function data(): array
    {
        return Cache::rememberForever('deeds.catalog', fn (): array => json_decode(
            (string) file_get_contents(resource_path('data/deeds.json')),
            true,
        ));
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function entries(DeedKind $kind): array
    {
        return $this->data()[$kind === DeedKind::Bad ? 'sins' : 'good'];
    }

    /**
     * @return list<string>
     */
    public function keys(DeedKind $kind): array
    {
        return array_column($this->entries($kind), 'key');
    }

    /**
     * @return array<string, mixed>|null
     */
    public function find(DeedKind $kind, ?string $key): ?array
    {
        if ($key === null) {
            return null;
        }

        foreach ($this->entries($kind) as $entry) {
            if ($entry['key'] === $key) {
                return $entry;
            }
        }

        return null;
    }

    public function severityOf(?string $key): ?SinSeverity
    {
        $entry = $this->find(DeedKind::Bad, $key);

        return $entry ? SinSeverity::from($entry['severity']) : null;
    }

    /**
     * The name of a catalog entry in the current language.
     */
    public function name(DeedKind $kind, ?string $key): ?string
    {
        $entry = $this->find($kind, $key);

        return $entry ? ($entry['name'][app()->getLocale()] ?? $entry['name']['ar']) : null;
    }
}
