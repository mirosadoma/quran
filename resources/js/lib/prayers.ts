import data from '../../data/prayers.json';
import type { Locale } from '@/types';

export interface Localized {
    ar: string;
    en: string;
}

export type PrayerReminderType = 'qiyam' | 'duha';

export interface PrayerGuide {
    slug: string;
    icon: string;
    tone: 'violet' | 'gold' | 'emerald' | 'sky' | 'rose' | 'teal' | 'slate';
    /** The guide has a daily reminder. */
    reminder?: PrayerReminderType;
    title: Localized;
    summary: Localized;
    facts: { label: Localized; value: Localized }[];
    steps: Localized[];
    /** Hadiths and ayahs, in Arabic. */
    virtues: { text: string; source: string }[];
    duas: { title: Localized; text: string; source: string }[];
}

/**
 * How to pray the voluntary prayers (resources/data/prayers.json).
 */
export const prayerGuides = data as PrayerGuide[];

export function localized(value: Localized, locale: Locale): string {
    return value[locale] ?? value.ar;
}
