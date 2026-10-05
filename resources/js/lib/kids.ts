/**
 * Kids memorization: the order of the short surahs and the best score of every ayah, kept on the device.
 */

/** Al-Fatihah, then the surahs of Juz Amma from An-Nas upwards, the order children learn them in. */
export const shortSurahs: number[] = [1, ...Array.from({ length: 37 }, (_, index) => 114 - index)];

export type KidsProgress = Record<number, Record<number, number>>;

const KEY = 'kids.progress';

export function readProgress(): KidsProgress {
    try {
        return JSON.parse(window.localStorage.getItem(KEY) ?? '{}') as KidsProgress;
    } catch {
        return {};
    }
}

/**
 * Keep the best score of an ayah.
 */
export function saveScore(progress: KidsProgress, surah: number, ayah: number, score: number): KidsProgress {
    const best = Math.max(score, progress[surah]?.[ayah] ?? 0);
    const next = { ...progress, [surah]: { ...progress[surah], [ayah]: best } };

    try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
        // Private mode: the stars are only kept until the page is closed.
    }

    return next;
}
