/**
 * The neglected sunnahs and the transmitted sayings (the sunnahs and sayings tables, sent by the server).
 */

/** Where a hadith is found in the hadith tables, to read it whole. */
export interface HadithReference {
    collection: string;
    number: number;
}

export interface SunnahItem {
    id: number;
    slug: string;
    title: string;
    /** How the sunnah is done. */
    text: string;
    /** The hadith it comes from, in Arabic. */
    evidence: string;
    source: string;
    hadith: HadithReference | null;
}

export interface SunnahCategoryItem {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    icon: string;
    color: string;
    sunnahs: SunnahItem[];
}

export type SayingKind = 'saying' | 'story';

export interface SayingItem {
    id: number;
    slug: string;
    kind: SayingKind;
    title: string | null;
    text: string;
    /** Who said it, or who narrated it. */
    attribution: string;
    source: string | null;
    lesson: string | null;
    hadith: HadithReference | null;
}

export interface SayingCategoryItem {
    id: number;
    slug: string;
    name: string;
    description: string | null;
    icon: string;
    color: string;
    sayings: SayingItem[];
}

/**
 * The page of the hadith a sunnah or a saying comes from.
 */
export function hadithHref(reference: HadithReference | null): string | null {
    return reference ? route('hadith.hadith', { collection: reference.collection, number: reference.number }) : null;
}
