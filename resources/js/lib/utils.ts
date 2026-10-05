import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Locale } from '@/types';

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

const titles = ['الشيخ', 'الشيخة', 'الأستاذ', 'الأستاذة', 'أ.', 'د.', 'شيخ', 'أستاذ', 'أستاذة'];

/**
 * One or two letters used in avatars.
 */
export function initials(name: string): string {
    const words = name
        .trim()
        .split(/\s+/)
        .filter((word) => word && !titles.includes(word));

    if (words.length === 0) {
        return '?';
    }

    if (/[؀-ۿ]/.test(words[0])) {
        return words[0].replace(/^ال/, '').charAt(0) || words[0].charAt(0);
    }

    return words
        .slice(0, 2)
        .map((word) => word.charAt(0).toUpperCase())
        .join('');
}

export function formatNumber(value: number, locale: Locale): string {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US').format(value);
}

export function formatBytes(bytes: number | null | undefined): string {
    if (!bytes) {
        return '';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));

    return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export interface ColorTokens {
    dot: string;
    soft: string;
    text: string;
    bar: string;
    gradient: string;
    border: string;
}

/**
 * Halaqa accent colors (full class names so Tailwind can find them).
 */
export const halaqaColors: Record<string, ColorTokens> = {
    emerald: {
        dot: 'bg-emerald-500',
        soft: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        text: 'text-emerald-600 dark:text-emerald-400',
        bar: 'bg-emerald-500',
        gradient: 'from-emerald-600 to-emerald-900',
        border: 'border-emerald-500',
    },
    gold: {
        dot: 'bg-gold-500',
        soft: 'bg-gold-500/10 text-gold-700 dark:text-gold-300',
        text: 'text-gold-600 dark:text-gold-400',
        bar: 'bg-gold-500',
        gradient: 'from-gold-500 to-gold-800',
        border: 'border-gold-500',
    },
    teal: {
        dot: 'bg-teal-500',
        soft: 'bg-teal-500/10 text-teal-700 dark:text-teal-300',
        text: 'text-teal-600 dark:text-teal-400',
        bar: 'bg-teal-500',
        gradient: 'from-teal-600 to-teal-900',
        border: 'border-teal-500',
    },
    sky: {
        dot: 'bg-sky-500',
        soft: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
        text: 'text-sky-600 dark:text-sky-400',
        bar: 'bg-sky-500',
        gradient: 'from-sky-600 to-sky-900',
        border: 'border-sky-500',
    },
    indigo: {
        dot: 'bg-indigo-500',
        soft: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300',
        text: 'text-indigo-600 dark:text-indigo-400',
        bar: 'bg-indigo-500',
        gradient: 'from-indigo-600 to-indigo-900',
        border: 'border-indigo-500',
    },
    violet: {
        dot: 'bg-violet-500',
        soft: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
        text: 'text-violet-600 dark:text-violet-400',
        bar: 'bg-violet-500',
        gradient: 'from-violet-600 to-violet-900',
        border: 'border-violet-500',
    },
    rose: {
        dot: 'bg-rose-500',
        soft: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
        text: 'text-rose-600 dark:text-rose-400',
        bar: 'bg-rose-500',
        gradient: 'from-rose-600 to-rose-900',
        border: 'border-rose-500',
    },
    amber: {
        dot: 'bg-amber-500',
        soft: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
        text: 'text-amber-600 dark:text-amber-400',
        bar: 'bg-amber-500',
        gradient: 'from-amber-600 to-amber-900',
        border: 'border-amber-500',
    },
    lime: {
        dot: 'bg-lime-500',
        soft: 'bg-lime-500/10 text-lime-700 dark:text-lime-300',
        text: 'text-lime-600 dark:text-lime-400',
        bar: 'bg-lime-500',
        gradient: 'from-lime-600 to-lime-900',
        border: 'border-lime-500',
    },
};

export function colorOf(color: string | null | undefined): ColorTokens {
    return halaqaColors[color ?? ''] ?? halaqaColors.emerald;
}

/**
 * Build a URL query string without empty values.
 */
export function cleanQuery<T extends Record<string, unknown>>(params: T): Partial<T> {
    return Object.fromEntries(
        Object.entries(params).filter(([, value]) => value !== null && value !== undefined && value !== ''),
    ) as Partial<T>;
}

export function generatePassword(length = 10): string {
    const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const values = crypto.getRandomValues(new Uint32Array(length));

    return Array.from(values, (value) => alphabet[value % alphabet.length]).join('');
}
