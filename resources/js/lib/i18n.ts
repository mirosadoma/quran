import { usePage } from '@inertiajs/react';
import { useCallback } from 'react';
import ar from '../../../lang/ar.json';
import type { Locale } from '@/types';

type Replacements = Record<string, string | number | null | undefined>;

const dictionaries: Record<Locale, Record<string, string>> = {
    ar: ar as Record<string, string>,
    en: {},
};

/**
 * Translate a string using the same JSON files as Laravel's __() helper.
 * English text is the key, so English needs no dictionary.
 */
export function translate(locale: Locale, key: string, replace?: Replacements): string {
    let text = dictionaries[locale]?.[key] ?? key;

    if (replace) {
        for (const [name, value] of Object.entries(replace)) {
            text = text.replaceAll(`:${name}`, String(value ?? ''));
        }
    }

    return text;
}

export type Translator = (key: string, replace?: Replacements) => string;

export function useTrans(): { t: Translator; locale: Locale; dir: 'rtl' | 'ltr'; isRtl: boolean } {
    const locale = usePage().props.locale;
    const t = useCallback<Translator>((key, replace) => translate(locale, key, replace), [locale]);

    return { t, locale, dir: locale === 'ar' ? 'rtl' : 'ltr', isRtl: locale === 'ar' };
}
