<?php

namespace App\Services;

use App\Models\Ayah;
use App\Models\Dhikr;
use App\Models\Saying;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * The short texts the companion (the lantern mascot) shows around the platform: ayahs, hadiths, adhkar and
 * sayings. resources/data/mascot-quotes.json holds references only (a surah and an ayah, the slug of a saying,
 * the category and the order of a dhikr): every text is read from the tables of the platform, so the companion
 * never shows a text that is not in the mushaf, the adhkar or the sayings pages. A reference that is missing
 * from the database is skipped.
 */
class MascotQuotes
{
    /**
     * Longest text shown whole in a bubble; longer ones are cut by the page with a "read more" link.
     */
    public const MAX_LENGTH = 180;

    public function __construct(protected Quran $quran) {}

    /**
     * The quotes in the order of the data file, for the given language of the interface.
     *
     * @return list<array{id: string, kind: string, text: string, source: string, href: string|null}>
     */
    public function all(string $locale): array
    {
        return Cache::remember("mascot.quotes.{$locale}", now()->addDay(), fn (): array => $this->resolve($locale));
    }

    /**
     * Drop the cached quotes of every language (after the adhkar or the sayings change).
     */
    public function forget(): void
    {
        foreach (config('app.supported_locales', ['ar', 'en']) as $locale) {
            Cache::forget("mascot.quotes.{$locale}");
        }
    }

    /**
     * @return array{ayahs: list<array{surah: int, ayah: int}>, hadiths: list<string>, adhkar: list<array{category: string, order: int}>, wisdom: list<string>}
     */
    public function references(): array
    {
        $data = json_decode((string) file_get_contents(resource_path('data/mascot-quotes.json')), true, flags: JSON_THROW_ON_ERROR);

        return [
            'ayahs' => array_values($data['ayahs'] ?? []),
            'hadiths' => array_values($data['hadiths'] ?? []),
            'adhkar' => array_values($data['adhkar'] ?? []),
            'wisdom' => array_values($data['wisdom'] ?? []),
        ];
    }

    /**
     * @return list<array{id: string, kind: string, text: string, source: string, href: string|null}>
     */
    protected function resolve(string $locale): array
    {
        $references = $this->references();

        return [
            ...$this->ayahs($references['ayahs'], $locale),
            ...$this->sayings($references['hadiths'], 'hadith'),
            ...$this->adhkar($references['adhkar']),
            ...$this->sayings($references['wisdom'], 'wisdom'),
        ];
    }

    /**
     * @param  list<array{surah: int, ayah: int}>  $references
     * @return list<array{id: string, kind: string, text: string, source: string, href: string|null}>
     */
    protected function ayahs(array $references, string $locale): array
    {
        if ($references === []) {
            return [];
        }

        $ayahs = Ayah::query()
            ->whereIn('surah', array_column($references, 'surah'))
            ->get(['id', 'surah', 'ayah', 'text'])
            ->keyBy(fn (Ayah $ayah): string => $ayah->key());

        $quotes = [];

        foreach ($references as $reference) {
            $ayah = $ayahs->get("{$reference['surah']}:{$reference['ayah']}");

            if ($ayah === null) {
                continue;
            }

            $quotes[] = [
                'id' => "ayah:{$ayah->key()}",
                'kind' => 'ayah',
                'text' => $this->cleanAyah($ayah->text),
                'source' => $locale === 'ar'
                    ? "سورة {$this->quran->surahName($ayah->surah, 'ar')}: {$ayah->ayah}"
                    : "{$this->quran->surahName($ayah->surah, 'en')} {$ayah->surah}:{$ayah->ayah}",
                'href' => route('mushaf.index', ['surah' => $ayah->surah, 'ayah' => $ayah->ayah]),
            ];
        }

        return $quotes;
    }

    /**
     * Hadiths and sayings both live in the sayings table: a hadith links to its page in the hadith books.
     *
     * @param  list<string>  $slugs
     * @return list<array{id: string, kind: string, text: string, source: string, href: string|null}>
     */
    protected function sayings(array $slugs, string $kind): array
    {
        if ($slugs === []) {
            return [];
        }

        /** @var Collection<string, Saying> $sayings */
        $sayings = Saying::query()->whereIn('slug', $slugs)->get()->keyBy('slug');

        $quotes = [];

        foreach ($slugs as $slug) {
            $saying = $sayings->get($slug);

            if ($saying === null) {
                continue;
            }

            $quotes[] = [
                'id' => "{$kind}:{$saying->slug}",
                'kind' => $kind,
                'text' => $saying->text,
                'source' => $kind === 'hadith'
                    ? ($saying->source ?? $saying->attribution)
                    : implode('، ', array_filter([$saying->attribution, $saying->source])),
                'href' => $saying->hadith_collection !== null && $saying->hadith_number !== null
                    ? route('hadith.hadith', ['collection' => $saying->hadith_collection, 'number' => $saying->hadith_number])
                    : route('sayings.index'),
            ];
        }

        return $quotes;
    }

    /**
     * @param  list<array{category: string, order: int}>  $references
     * @return list<array{id: string, kind: string, text: string, source: string, href: string|null}>
     */
    protected function adhkar(array $references): array
    {
        if ($references === []) {
            return [];
        }

        $adhkar = Dhikr::query()
            ->active()
            ->with('category:id,slug')
            ->whereHas('category', fn ($query) => $query->whereIn('slug', array_unique(array_column($references, 'category'))))
            ->get()
            ->keyBy(fn (Dhikr $dhikr): string => "{$dhikr->category->slug}:{$dhikr->sort_order}");

        $quotes = [];

        foreach ($references as $reference) {
            $dhikr = $adhkar->get("{$reference['category']}:{$reference['order']}");

            if ($dhikr === null) {
                continue;
            }

            $quotes[] = [
                'id' => "dhikr:{$reference['category']}:{$reference['order']}",
                'kind' => 'dhikr',
                'text' => $dhikr->text,
                'source' => $dhikr->reference ?? $dhikr->title ?? '',
                'href' => route('adhkar.index'),
            ];
        }

        return $quotes;
    }

    /**
     * The rub-el-hizb mark that opens some ayahs is a page ornament, not part of the text.
     */
    protected function cleanAyah(string $text): string
    {
        return trim(preg_replace('/^[۞\s]+/u', '', $text) ?? $text);
    }
}
