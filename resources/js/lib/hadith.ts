import type { Tone } from '@/lib/labels';
import type { Locale } from '@/types';

/**
 * A book of hadith (Sahih al-Bukhari, Sahih Muslim...) as the hadith pages show it.
 */
export interface HadithCollectionItem {
    id: number;
    slug: string;
    name: string;
    name_en: string;
    author: string;
    author_en: string;
    description: string | null;
    description_en: string | null;
    /** A lucide icon name known to CollectionIcon. */
    icon: string;
    /** One of the halaqa accent colors. */
    color: string;
    books_count: number | null;
    hadiths_count: number | null;
}

/**
 * A book (kitab) inside a collection, e.g. "كتاب الإيمان".
 */
export interface HadithBookItem {
    id: number;
    number: number;
    name: string;
    name_en: string | null;
    hadiths_count: number | null;
}

export interface HadithItem {
    id: number;
    number: number;
    part: number;
    /** "402", or "402.2" for the second part of hadith 402. */
    label: string;
    text: string;
    grade: string | null;
    grader: string | null;
    book: { number: number; name: string; name_en: string | null } | null;
    collection: { slug: string; name: string; name_en: string; color: string } | null;
}

/**
 * The name of a collection or a book in the language of the page (Arabic when there is no English one).
 */
export function nameOf(item: { name: string; name_en?: string | null }, locale: Locale): string {
    return locale === 'en' && item.name_en ? item.name_en : item.name;
}

/**
 * The tone of the badge of a grade: authentic in green, hasan in blue, weak in red.
 */
export function gradeTone(grade: string | null): Tone {
    if (!grade) {
        return 'slate';
    }

    if (/ضعيف|موضوع|باطل|منكر|شاذ|معلول/.test(grade)) {
        return 'rose';
    }

    if (grade.includes('صحيح')) {
        return 'emerald';
    }

    return grade.includes('حسن') ? 'sky' : 'slate';
}

const badgeTones: Tone[] = ['emerald', 'gold', 'sky', 'rose', 'amber', 'slate', 'violet', 'teal'];

/**
 * The badge tone closest to the accent color of a collection.
 */
export function collectionTone(color: string): Tone {
    return badgeTones.find((tone) => tone === color) ?? 'slate';
}

/**
 * The text copied with a hadith: its text, then its source and its grade.
 */
export function citation(hadith: HadithItem, collectionName: string): string {
    const source = [`${collectionName} (${hadith.label})`, hadith.grade].filter(Boolean).join(' · ');

    return `${hadith.text}\n\n${source}`;
}
