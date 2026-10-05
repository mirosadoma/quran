import data from '../../data/deeds.json';
import type { Localized } from '@/lib/prayers';

export type DeedKind = 'good' | 'bad';
export type SinSeverity = 'minor' | 'major';

export interface Evidence {
    text: string;
    source: string;
}

interface CatalogEntry {
    key: string;
    name: Localized;
    keywords: string[];
}

export interface SinEntry extends CatalogEntry {
    severity: SinSeverity;
    /** How to repent of it. */
    repent: Localized;
    /** Its expiation, when it has a specific one. */
    kaffarah: Localized | null;
    evidence: Evidence | null;
}

export interface GoodEntry extends CatalogEntry {
    virtue: Evidence | null;
}

export interface DeedItem {
    id: number;
    kind: DeedKind;
    title: string;
    notes: string | null;
    catalog_key: string | null;
    severity: SinSeverity | null;
    date: string;
    time: string;
    repented_at: string | null;
}

export interface DayCounts {
    date: string;
    good: number;
    bad: number;
    major: number;
    repented: number;
    unrepented: number;
    net: number;
}

/**
 * Common sins and good deeds (resources/data/deeds.json): severity, how to repent, expiations.
 */
export const deedCatalog = data as {
    repentance: Record<'ar' | 'en', string[]>;
    istighfar: { title: Localized; text: string; source: string }[];
    sins: SinEntry[];
    good: GoodEntry[];
};

export function findEntry(kind: DeedKind, key: string | null): SinEntry | GoodEntry | undefined {
    if (!key) {
        return undefined;
    }

    return kind === 'bad' ? deedCatalog.sins.find((entry) => entry.key === key) : deedCatalog.good.find((entry) => entry.key === key);
}

/**
 * Text reduced for matching: no diacritics, one form of alef, ya, ta marbuta and hamza.
 */
function normalize(text: string): string {
    return text
        .toLowerCase()
        .replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

/** Letters that may be attached before a word: and, so, the, with, for. */
const PREFIXES = ['', 'و', 'ف', 'ال', 'وال', 'فال', 'ب', 'بال', 'لل', 'ك'];

const normalized = new Map<CatalogEntry, string[]>();

function keywordsOf(entry: CatalogEntry): string[] {
    let keywords = normalized.get(entry);

    if (!keywords) {
        keywords = entry.keywords.map(normalize).filter(Boolean);
        normalized.set(entry, keywords);
    }

    return keywords;
}

/**
 * The catalog entry a description talks about: its keywords must start a word of the text; the
 * entry with the most (and longest) matching keywords wins, so «حلفت كذب» is a false oath, not a lie.
 */
export function matchDeed<T extends CatalogEntry>(text: string, entries: T[]): T | null {
    const haystack = ` ${normalize(text)} `;

    if (haystack.trim() === '') {
        return null;
    }

    let best: T | null = null;
    let bestScore = 0;

    for (const entry of entries) {
        const score = keywordsOf(entry)
            .filter((keyword) => PREFIXES.some((prefix) => haystack.includes(` ${prefix}${keyword}`)))
            .reduce((total, keyword) => total + keyword.length, 0);

        if (score > bestScore) {
            best = entry;
            bestScore = score;
        }
    }

    return best;
}
