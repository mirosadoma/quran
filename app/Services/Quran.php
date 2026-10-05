<?php

namespace App\Services;

use InvalidArgumentException;

/**
 * Quran metadata (surahs, ayah counts and juz boundaries) and helpers to
 * measure memorized portions. Ayahs are addressed by an absolute index
 * from 1 to 6236 so ranges spanning several surahs can be merged easily.
 */
class Quran
{
    /**
     * @var array{total_ayahs: int, surahs: list<array{number: int, ar: string, en: string, ayahs: int, type: string}>, juz_starts: list<array{0: int, 1: int}>}|null
     */
    protected ?array $data = null;

    /**
     * Number of ayahs before each surah, keyed by surah number.
     *
     * @var array<int, int>
     */
    protected array $offsets = [];

    /**
     * @var list<array{0: int, 1: int}>|null
     */
    protected ?array $juzRanges = null;

    /**
     * @return array{total_ayahs: int, surahs: list<array{number: int, ar: string, en: string, ayahs: int, type: string}>, juz_starts: list<array{0: int, 1: int}>}
     */
    public function data(): array
    {
        if ($this->data === null) {
            $this->data = json_decode(
                (string) file_get_contents(resource_path('data/quran.json')),
                true,
                flags: JSON_THROW_ON_ERROR,
            );

            $offset = 0;

            foreach ($this->data['surahs'] as $surah) {
                $this->offsets[$surah['number']] = $offset;
                $offset += $surah['ayahs'];
            }
        }

        return $this->data;
    }

    public function totalAyahs(): int
    {
        return $this->data()['total_ayahs'];
    }

    /**
     * @return list<array{number: int, ar: string, en: string, ayahs: int, type: string}>
     */
    public function surahs(): array
    {
        return $this->data()['surahs'];
    }

    /**
     * @return array{number: int, ar: string, en: string, ayahs: int, type: string}|null
     */
    public function surah(int $number): ?array
    {
        return $this->data()['surahs'][$number - 1] ?? null;
    }

    public function surahName(int $number, ?string $locale = null): string
    {
        $surah = $this->surah($number);

        if ($surah === null) {
            return (string) $number;
        }

        return ($locale ?? app()->getLocale()) === 'ar' ? $surah['ar'] : $surah['en'];
    }

    public function ayahCount(int $surah): int
    {
        return $this->surah($surah)['ayahs'] ?? 0;
    }

    public function isValid(int $surah, int $ayah): bool
    {
        return $surah >= 1 && $surah <= 114 && $ayah >= 1 && $ayah <= $this->ayahCount($surah);
    }

    /**
     * Convert a surah/ayah position into an absolute ayah index (1 - 6236).
     */
    public function absolute(int $surah, int $ayah): int
    {
        if (! $this->isValid($surah, $ayah)) {
            throw new InvalidArgumentException("Invalid ayah position {$surah}:{$ayah}.");
        }

        return $this->offsets[$surah] + $ayah;
    }

    /**
     * Count the ayahs between two positions (inclusive, order independent).
     */
    public function countRange(int $fromSurah, int $fromAyah, int $toSurah, int $toAyah): int
    {
        return abs($this->absolute($toSurah, $toAyah) - $this->absolute($fromSurah, $fromAyah)) + 1;
    }

    /**
     * Human readable range such as "البقرة 1 - 20" or "الملك 1 - القلم 15".
     */
    public function rangeLabel(int $fromSurah, int $fromAyah, int $toSurah, int $toAyah, ?string $locale = null): string
    {
        $from = $this->surahName($fromSurah, $locale);

        if ($fromSurah === $toSurah) {
            return "{$from} {$fromAyah} - {$toAyah}";
        }

        return "{$from} {$fromAyah} - {$this->surahName($toSurah, $locale)} {$toAyah}";
    }

    /**
     * Absolute [start, end] range of every juz.
     *
     * @return list<array{0: int, 1: int}>
     */
    public function juzRanges(): array
    {
        if ($this->juzRanges === null) {
            $starts = array_map(
                fn (array $start): int => $this->absolute($start[0], $start[1]),
                $this->data()['juz_starts'],
            );

            $this->juzRanges = [];

            foreach ($starts as $index => $start) {
                $this->juzRanges[] = [$start, ($starts[$index + 1] ?? $this->totalAyahs() + 1) - 1];
            }
        }

        return $this->juzRanges;
    }

    /**
     * Sort and merge overlapping or adjacent absolute ranges.
     *
     * @param  iterable<array{0: int, 1: int}>  $ranges
     * @return list<array{0: int, 1: int}>
     */
    public function mergeRanges(iterable $ranges): array
    {
        $normalized = [];

        foreach ($ranges as [$start, $end]) {
            $normalized[] = [min($start, $end), max($start, $end)];
        }

        usort($normalized, fn (array $a, array $b): int => $a[0] <=> $b[0]);

        $merged = [];

        foreach ($normalized as [$start, $end]) {
            $last = count($merged) - 1;

            if ($last >= 0 && $start <= $merged[$last][1] + 1) {
                $merged[$last][1] = max($merged[$last][1], $end);
            } else {
                $merged[] = [$start, $end];
            }
        }

        return $merged;
    }

    /**
     * Summarize how much of the Quran the given ranges cover.
     *
     * @param  iterable<array{0: int, 1: int}>  $ranges
     * @return array{ayahs: int, percent: float, completed_juz: int, completed_surahs: int, juz: list<array{number: int, covered: int, total: int}>, surahs: list<array{number: int, covered: int, total: int}>}
     */
    public function coverage(iterable $ranges): array
    {
        $merged = $this->mergeRanges($ranges);
        $total = array_sum(array_map(fn (array $range): int => $range[1] - $range[0] + 1, $merged));

        $juz = [];

        foreach ($this->juzRanges() as $index => [$start, $end]) {
            $juz[] = [
                'number' => $index + 1,
                'covered' => $this->overlap($merged, $start, $end),
                'total' => $end - $start + 1,
            ];
        }

        $surahs = [];

        foreach ($this->surahs() as $surah) {
            $start = $this->offsets[$surah['number']] + 1;
            $covered = $this->overlap($merged, $start, $start + $surah['ayahs'] - 1);

            if ($covered > 0) {
                $surahs[] = ['number' => $surah['number'], 'covered' => $covered, 'total' => $surah['ayahs']];
            }
        }

        return [
            'ayahs' => $total,
            'percent' => round($total / $this->totalAyahs() * 100, 1),
            'completed_juz' => count(array_filter($juz, fn (array $item): bool => $item['covered'] === $item['total'])),
            'completed_surahs' => count(array_filter($surahs, fn (array $item): bool => $item['covered'] === $item['total'])),
            'juz' => $juz,
            'surahs' => $surahs,
        ];
    }

    /**
     * Count how many ayahs of [start, end] are covered by the merged ranges.
     *
     * @param  list<array{0: int, 1: int}>  $merged
     */
    protected function overlap(array $merged, int $start, int $end): int
    {
        $covered = 0;

        foreach ($merged as [$rangeStart, $rangeEnd]) {
            if ($rangeStart > $end) {
                break;
            }

            $covered += max(0, min($end, $rangeEnd) - max($start, $rangeStart) + 1);
        }

        return $covered;
    }
}
