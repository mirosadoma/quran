import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';
import type { Locale } from '@/types';

export function intlLocale(locale: Locale): string {
    return locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US';
}

/**
 * Calendar day (YYYY-MM-DD) of a moment in the given timezone.
 */
export function dayKey(value: string | Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(typeof value === 'string' ? new Date(value) : value);

    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

    return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Date and time formatting in the signed-in user's language and timezone.
 */
export function useDates() {
    const { locale, timezone } = usePage().props;

    return useMemo(() => {
        const intl = intlLocale(locale);
        const format = (value: string | Date, options: Intl.DateTimeFormatOptions, timeZone = timezone) =>
            new Intl.DateTimeFormat(intl, { timeZone, ...options }).format(typeof value === 'string' ? new Date(value) : value);

        const relativeFormatter = new Intl.RelativeTimeFormat(intl, { numeric: 'auto' });
        const today = () => dayKey(new Date(), timezone);
        const offsetDay = (days: number) => dayKey(new Date(Date.now() + days * 86_400_000), timezone);

        return {
            timezone,
            /** 5 Oct 2026 */
            date: (value: string | Date, options: Intl.DateTimeFormatOptions = {}) =>
                format(value, { day: 'numeric', month: 'short', year: 'numeric', ...options }),
            /** A plain calendar date (YYYY-MM-DD) without timezone shifting. */
            day: (value: string, options: Intl.DateTimeFormatOptions = {}) =>
                format(`${value.slice(0, 10)}T12:00:00Z`, { day: 'numeric', month: 'short', year: 'numeric', ...options }, 'UTC'),
            /** 5:30 PM */
            time: (value: string | Date) => format(value, { hour: 'numeric', minute: '2-digit' }),
            /** Sunday, 5 Oct, 5:30 PM */
            dateTime: (value: string | Date) =>
                format(value, { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
            weekday: (value: string | Date) => format(value, { weekday: 'long' }),
            /** Weekday name for schedule slots (0 = Sunday). */
            dayName: (day: number, style: 'long' | 'short' = 'long') =>
                format(new Date(Date.UTC(2023, 0, 1 + day, 12)), { weekday: style }, 'UTC'),
            /** "17:30" shown as a localized clock time. */
            clock: (hhmm: string) => {
                const [hours, minutes] = hhmm.split(':').map(Number);

                return format(new Date(Date.UTC(2023, 0, 1, hours, minutes)), { hour: 'numeric', minute: '2-digit' }, 'UTC');
            },
            hijri: (value: Date = new Date()) =>
                new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA-u-ca-islamic-umalqura-nu-latn' : 'en-US-u-ca-islamic-umalqura', {
                    timeZone: timezone,
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                }).format(value),
            relative: (value: string | Date) => {
                const seconds = Math.round(((typeof value === 'string' ? new Date(value) : value).getTime() - Date.now()) / 1000);
                const units: [Intl.RelativeTimeFormatUnit, number][] = [
                    ['year', 31_536_000],
                    ['month', 2_592_000],
                    ['week', 604_800],
                    ['day', 86_400],
                    ['hour', 3_600],
                    ['minute', 60],
                ];

                for (const [unit, size] of units) {
                    if (Math.abs(seconds) >= size) {
                        return relativeFormatter.format(Math.round(seconds / size), unit);
                    }
                }

                return relativeFormatter.format(0, 'minute');
            },
            dayKey: (value: string | Date) => dayKey(value, timezone),
            isToday: (value: string | Date) => dayKey(value, timezone) === today(),
            isTomorrow: (value: string | Date) => dayKey(value, timezone) === offsetDay(1),
            isYesterday: (value: string | Date) => dayKey(value, timezone) === offsetDay(-1),
            today,
        };
    }, [locale, timezone]);
}
