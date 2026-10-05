import { useEffect, useState } from 'react';
import { http } from '@/lib/http';
import type { HighlightColor, MushafAyah } from '@/types';

export const TOTAL_PAGES = 604;

/**
 * Ayahs of the pages already downloaded, shared by every reader on the page.
 */
const pages = new Map<number, MushafAyah[]>();
const requests = new Map<number, Promise<MushafAyah[]>>();
const listeners = new Set<() => void>();

export function clampPage(page: number): number {
    return Math.min(TOTAL_PAGES, Math.max(1, Math.round(page) || 1));
}

export function cachedPage(page: number): MushafAyah[] | undefined {
    return pages.get(page);
}

/**
 * Download a page once; later calls reuse the same request or the cached ayahs.
 */
export function loadPage(page: number): Promise<MushafAyah[]> {
    const cached = pages.get(page);

    if (cached) {
        return Promise.resolve(cached);
    }

    let request = requests.get(page);

    if (!request) {
        request = http
            .get<{ ayahs: MushafAyah[] }>(route('mushaf.page', page))
            .then(({ data }) => {
                pages.set(page, data.ayahs);
                listeners.forEach((listener) => listener());

                return data.ayahs;
            })
            .finally(() => requests.delete(page));

        requests.set(page, request);
    }

    return request;
}

/**
 * Change an ayah of the downloaded pages (its word meanings were edited).
 */
export function updateCachedAyah(ayahId: number, changes: Partial<MushafAyah>): void {
    for (const [page, ayahs] of pages) {
        if (ayahs.some((ayah) => ayah.id === ayahId)) {
            pages.set(
                page,
                ayahs.map((ayah) => (ayah.id === ayahId ? { ...ayah, ...changes } : ayah)),
            );
            listeners.forEach((listener) => listener());
        }
    }
}

/**
 * Ayahs of the given pages, downloading the missing ones (undefined while loading).
 */
export function useMushafPages(numbers: number[]): Record<number, MushafAyah[] | undefined> {
    const [, setVersion] = useState(0);
    const key = numbers.join(',');

    useEffect(() => {
        const listener = () => setVersion((version) => version + 1);
        listeners.add(listener);

        return () => {
            listeners.delete(listener);
        };
    }, []);

    useEffect(() => {
        numbers.filter((page) => page >= 1 && page <= TOTAL_PAGES).forEach((page) => void loadPage(page).catch(() => undefined));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    return Object.fromEntries(numbers.map((page) => [page, pages.get(page)]));
}

/**
 * Page that holds an ayah, from the first ayah of every page.
 */
export function pageOfAyah(pageStarts: number[], ayahId: number): number {
    let low = 0;
    let high = pageStarts.length - 1;

    while (low < high) {
        const middle = Math.ceil((low + high) / 2);

        if (pageStarts[middle] <= ayahId) {
            low = middle;
        } else {
            high = middle - 1;
        }
    }

    return low + 1;
}

/**
 * Pages shown together on a wide screen: the odd page on the right, the next one on the left.
 */
export function spreadOf(page: number): { right: number; left: number | null } {
    const right = page % 2 === 1 ? page : page - 1;

    return { right, left: right + 1 <= TOTAL_PAGES ? right + 1 : null };
}

export const highlightColors: HighlightColor[] = ['gold', 'emerald', 'sky', 'rose', 'violet'];

/**
 * Background of a marked ayah, and the swatch to pick the color.
 */
export const highlightClasses: Record<HighlightColor, { mark: string; swatch: string }> = {
    gold: { mark: 'bg-gold-300/45 dark:bg-gold-400/25', swatch: 'bg-gold-400' },
    emerald: { mark: 'bg-emerald-300/40 dark:bg-emerald-400/20', swatch: 'bg-emerald-500' },
    sky: { mark: 'bg-sky-300/40 dark:bg-sky-400/20', swatch: 'bg-sky-500' },
    rose: { mark: 'bg-rose-300/40 dark:bg-rose-400/20', swatch: 'bg-rose-500' },
    violet: { mark: 'bg-violet-300/40 dark:bg-violet-400/20', swatch: 'bg-violet-500' },
};

/**
 * Remember small reader preferences on this device.
 */
export function readPreference<T>(key: string, fallback: T): T {
    try {
        const value = window.localStorage.getItem(`mushaf.${key}`);

        return value === null ? fallback : (JSON.parse(value) as T);
    } catch {
        return fallback;
    }
}

export function writePreference(key: string, value: unknown): void {
    try {
        window.localStorage.setItem(`mushaf.${key}`, JSON.stringify(value));
    } catch {
        // Storage can be unavailable (private mode); the preference is simply not kept.
    }
}
