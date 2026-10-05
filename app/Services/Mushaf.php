<?php

namespace App\Services;

use App\Enums\TafsirEdition;
use App\Models\Ayah;
use App\Models\Tafsir;
use Illuminate\Support\Facades\Cache;

/**
 * Pages, index, search and tafsir of the mushaf (Madani mushaf of 604 pages).
 * The Quran text never changes, so pages and the index are cached forever;
 * the AyahSeeder clears this cache after (re)seeding.
 */
class Mushaf
{
    public const PAGES = 604;

    /**
     * Ayahs printed on a page, in order.
     *
     * @return list<array{id: int, surah: int, ayah: int, text: string, juz: int, hizb_quarter: int, sajda: bool}>
     */
    public function page(int $page): array
    {
        return Cache::rememberForever("mushaf.page.{$page}", fn (): array => Ayah::query()
            ->where('page', $page)
            ->orderBy('id')
            ->get(['id', 'surah', 'ayah', 'text', 'juz', 'hizb_quarter', 'sajda'])
            ->map(fn (Ayah $ayah): array => [
                'id' => $ayah->id,
                'surah' => $ayah->surah,
                'ayah' => $ayah->ayah,
                'text' => $ayah->text,
                'juz' => $ayah->juz,
                'hizb_quarter' => $ayah->hizb_quarter,
                'sajda' => $ayah->sajda,
            ])
            ->all());
    }

    /**
     * Start page of every surah and juz, where every quarter of a hizb starts,
     * and the first ayah of every page (to find the page of any ayah).
     *
     * @return array{surahs: array<int, int>, juz: array<int, int>, quarters: list<array{quarter: int, surah: int, ayah: int, page: int}>, page_starts: list<int>}
     */
    public function index(): array
    {
        return Cache::rememberForever('mushaf.index', function (): array {
            $firstAyahs = Ayah::query()
                ->selectRaw('hizb_quarter, MIN(id) as first_id')
                ->groupBy('hizb_quarter')
                ->pluck('first_id');

            return [
                'surahs' => Ayah::query()->where('ayah', 1)->orderBy('surah')->pluck('page', 'surah')->all(),
                'juz' => Ayah::query()->selectRaw('juz, MIN(page) as start_page')->groupBy('juz')->orderBy('juz')->pluck('start_page', 'juz')->map(fn ($page): int => (int) $page)->all(),
                'quarters' => Ayah::query()
                    ->whereIn('id', $firstAyahs)
                    ->orderBy('id')
                    ->get(['hizb_quarter', 'surah', 'ayah', 'page'])
                    ->map(fn (Ayah $ayah): array => [
                        'quarter' => $ayah->hizb_quarter,
                        'surah' => $ayah->surah,
                        'ayah' => $ayah->ayah,
                        'page' => $ayah->page,
                    ])
                    ->all(),
                'page_starts' => Ayah::query()
                    ->selectRaw('page, MIN(id) as first_id')
                    ->groupBy('page')
                    ->orderBy('page')
                    ->pluck('first_id')
                    ->map(fn ($id): int => (int) $id)
                    ->all(),
            ];
        });
    }

    /**
     * Ayahs containing the words, ignoring diacritics and letter forms.
     * A reference such as "2:255" jumps straight to that ayah.
     *
     * @return list<array{id: int, surah: int, ayah: int, page: int, text: string}>
     */
    public function search(string $term, int $limit = 50): array
    {
        $term = trim($term);
        $query = Ayah::query()->orderBy('id')->limit($limit);

        if (preg_match('/^(\d{1,3})\s*[:\-.\/ ]\s*(\d{1,3})$/', $term, $matches) === 1) {
            $query->where('surah', (int) $matches[1])->where('ayah', (int) $matches[2]);
        } else {
            $normalized = static::normalize($term);

            if (mb_strlen($normalized) < 2) {
                return [];
            }

            $query->where('text_search', 'like', '%'.addcslashes($normalized, '%_\\').'%');
        }

        return $query->get(['id', 'surah', 'ayah', 'page', 'text'])
            ->map(fn (Ayah $ayah): array => $ayah->only(['id', 'surah', 'ayah', 'page', 'text']))
            ->all();
    }

    /**
     * Explanation of an ayah in a tafsir book.
     */
    public function tafsir(Ayah $ayah, TafsirEdition $edition): ?string
    {
        return Tafsir::query()->where('edition', $edition)->where('ayah_id', $ayah->id)->value('text');
    }

    /**
     * Forget the cached pages and index (after seeding the Quran text).
     */
    public function flush(): void
    {
        Cache::forget('mushaf.index');

        foreach (range(1, self::PAGES) as $page) {
            Cache::forget("mushaf.page.{$page}");
        }
    }

    /**
     * Arabic text reduced to bare letters so searches match whatever the user types:
     * no diacritics or Quranic marks, one form of alef, ya and ha.
     */
    public static function normalize(string $text): string
    {
        $text = preg_replace('/[\x{0610}-\x{061A}\x{064B}-\x{065F}\x{0670}\x{06D6}-\x{06ED}\x{0640}]/u', '', $text) ?? $text;
        $text = strtr($text, ['أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ٱ' => 'ا', 'ى' => 'ي', 'ة' => 'ه', 'ؤ' => 'و', 'ئ' => 'ي']);

        return trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
    }
}
