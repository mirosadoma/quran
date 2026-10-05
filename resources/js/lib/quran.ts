import data from '../../data/quran.json';
import type { Locale } from '@/types';

export interface Surah {
    number: number;
    ar: string;
    en: string;
    ayahs: number;
    type: string;
}

export const surahs: Surah[] = data.surahs;

export const TOTAL_AYAHS: number = data.total_ayahs;

export function surah(number: number): Surah | undefined {
    return surahs[number - 1];
}

export function surahName(number: number, locale: Locale): string {
    const item = surah(number);

    if (!item) {
        return String(number);
    }

    return locale === 'ar' ? item.ar : item.en;
}

export function ayahCount(number: number): number {
    return surah(number)?.ayahs ?? 0;
}

/**
 * "البقرة 1 - 20" or "الملك 1 - القلم 15".
 */
export function rangeLabel(
    range: { from_surah: number; from_ayah: number; to_surah: number; to_ayah: number },
    locale: Locale,
): string {
    const from = surahName(range.from_surah, locale);

    if (range.from_surah === range.to_surah) {
        return `${from} ${range.from_ayah} - ${range.to_ayah}`;
    }

    return `${from} ${range.from_ayah} - ${surahName(range.to_surah, locale)} ${range.to_ayah}`;
}

/**
 * Position right after the given one (continue memorizing from here).
 */
export function nextPosition(position: { surah: number; ayah: number }): { surah: number; ayah: number } {
    if (position.ayah < ayahCount(position.surah)) {
        return { surah: position.surah, ayah: position.ayah + 1 };
    }

    return position.surah < 114 ? { surah: position.surah + 1, ayah: 1 } : position;
}

/**
 * Loose Arabic matching for search: ignore diacritics and hamza/taa marbuta forms.
 */
export function normalizeArabic(value: string): string {
    return value
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي');
}

const offsets: number[] = [];

surahs.reduce((total, item) => {
    offsets[item.number] = total;

    return total + item.ayahs;
}, 0);

export function isValidAyah(surahNumber: number | null | undefined, ayah: number | null | undefined): boolean {
    return !!surahNumber && !!ayah && ayah >= 1 && ayah <= ayahCount(surahNumber);
}

/**
 * Number of ayahs between two positions (inclusive), or null when a position is invalid.
 */
export function countAyahs(fromSurah: number | null, fromAyah: number | null, toSurah: number | null, toAyah: number | null): number | null {
    if (!isValidAyah(fromSurah, fromAyah) || !isValidAyah(toSurah, toAyah)) {
        return null;
    }

    const start = offsets[fromSurah as number] + (fromAyah as number);
    const end = offsets[toSurah as number] + (toAyah as number);

    return end >= start ? end - start + 1 : null;
}
