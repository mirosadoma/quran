import type { Locale } from '@/types';

/**
 * The stories for children and the stories of the prophets (one JSON file per story in
 * resources/data/stories, loaded by the server).
 */
export type StoryKind = 'kids' | 'prophets';

export type StoryTone = 'emerald' | 'sky' | 'violet' | 'amber' | 'rose' | 'teal';

export interface Localized {
    ar: string;
    en: string;
}

/**
 * A story as the list of its library shows it.
 */
export interface StorySummary {
    slug: string;
    order: number;
    title: Localized;
    summary: Localized;
    icon: string | null;
    tone: string | null;
    /** Minutes to read or to listen to it. */
    minutes: number;
}

/**
 * A Quran passage of a story: a reference, with the text of its ayahs when the Quran text is installed.
 */
export interface StoryPassage {
    surah: number;
    from: number;
    to: number;
    verses: { ayah: number; text: string }[];
}

export interface StorySection {
    heading: string | null;
    /** Arabic text. */
    paragraphs: string[];
    /** Shown after the paragraphs. */
    ayahs: StoryPassage[];
}

export interface Story extends StorySummary {
    sections: StorySection[];
    /** The lessons of the story (Arabic). */
    lessons: string[];
    /** A recorded narration, read instead of the voice of the device. */
    audio: string | null;
}

export const storyTones: StoryTone[] = ['emerald', 'sky', 'violet', 'amber', 'rose', 'teal'];

/**
 * The tone of a story, or one in turn by its order when it has none.
 */
export function toneOf(story: Pick<StorySummary, 'tone' | 'order'>): StoryTone {
    const tone = storyTones.find((item) => item === story.tone);

    return tone ?? storyTones[Math.abs(story.order) % storyTones.length];
}

export function localized(value: Localized, locale: Locale): string {
    return value[locale] || value.ar;
}

/**
 * Name of a route of a library: kids-stories.index, prophets-stories.show…
 */
export function storyRoute(kind: StoryKind, action: 'index' | 'show'): string {
    return `${kind}-stories.${action}`;
}

/**
 * Sizes of the text of a story in pixels (A- / A+), and the one used at first.
 */
export const textSizes: Record<StoryKind, number[]> = {
    kids: [18, 20, 22, 25, 28, 32],
    prophets: [16, 18, 20, 22, 25, 28],
};

export const defaultTextSize = 2;
