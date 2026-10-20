import type { Locale } from '@/types';

export interface Localized {
    ar: string;
    en: string;
}

export type PrayerReminderType = 'qiyam' | 'duha';

/**
 * A prayer of the guide as the list of the prayers page shows it (the prayer_guides table, sent by the server).
 */
export interface PrayerGuideSummary {
    slug: string;
    icon: string;
    tone: 'violet' | 'gold' | 'emerald' | 'sky' | 'rose' | 'teal' | 'slate';
    /** The guide has a daily reminder. */
    reminder: PrayerReminderType | null;
    title: Localized;
    summary: Localized;
}

/**
 * How to pray one of the voluntary prayers.
 */
export interface PrayerGuide extends PrayerGuideSummary {
    facts: { label: Localized; value: Localized }[];
    steps: Localized[];
    /** Hadiths and ayahs, in Arabic. */
    virtues: { text: string; source: string }[];
    duas: { title: Localized; text: string; source: string }[];
}

export function localized(value: Localized, locale: Locale): string {
    return value[locale] ?? value.ar;
}
