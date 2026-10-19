import type { Localized } from '@/lib/prayers';
import type { Locale } from '@/types';

export type OccasionKind = 'islamic' | 'national' | 'season';

export interface Occasion {
    /** YYYY-MM-DD (Gregorian, in the user's timezone). */
    date: string;
    title: Localized;
    kind: OccasionKind;
    /** A stable key: the same occasion on several days shares it (Eid days). */
    key: string;
    /** Day number inside a multi-day occasion (Eid: 1, 2, 3...). */
    day?: number;
    description?: Localized;
}

export interface HijriDate {
    day: number;
    month: number;
    year: number;
    monthName: string;
}

export interface CalendarDay {
    /** YYYY-MM-DD */
    key: string;
    date: Date;
    day: number;
    weekday: number;
    inMonth: boolean;
    hijri: HijriDate;
    occasions: Occasion[];
}

export const hijriMonths: Localized[] = [
    { ar: 'محرّم', en: 'Muharram' },
    { ar: 'صفر', en: 'Safar' },
    { ar: 'ربيع الأول', en: "Rabi' al-Awwal" },
    { ar: 'ربيع الآخر', en: "Rabi' al-Thani" },
    { ar: 'جمادى الأولى', en: 'Jumada al-Ula' },
    { ar: 'جمادى الآخرة', en: 'Jumada al-Akhirah' },
    { ar: 'رجب', en: 'Rajab' },
    { ar: 'شعبان', en: "Sha'ban" },
    { ar: 'رمضان', en: 'Ramadan' },
    { ar: 'شوال', en: 'Shawwal' },
    { ar: 'ذو القعدة', en: "Dhu al-Qi'dah" },
    { ar: 'ذو الحجة', en: 'Dhu al-Hijjah' },
];

/**
 * Saturday first, as the week is shown in the region.
 */
export const weekOrder = [6, 0, 1, 2, 3, 4, 5];

const hijriFormatters = new Map<string, Intl.DateTimeFormat>();

function hijriFormatter(timezone: string): Intl.DateTimeFormat {
    let formatter = hijriFormatters.get(timezone);

    if (!formatter) {
        formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: timezone, day: 'numeric', month: 'numeric', year: 'numeric' });
        hijriFormatters.set(timezone, formatter);
    }

    return formatter;
}

/**
 * The Hijri date (Umm al-Qura calendar) of a moment in the given timezone.
 */
export function hijriOf(date: Date, timezone: string, locale: Locale): HijriDate {
    const parts = hijriFormatter(timezone).formatToParts(date);
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const month = get('month');

    return { day: get('day'), month, year: get('year'), monthName: hijriMonths[month - 1]?.[locale] ?? '' };
}

export function dayKey(date: Date, timezone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';

    return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * Noon (UTC) of a calendar date, a safe moment to format in any timezone.
 */
export function noon(year: number, month: number, day: number): Date {
    return new Date(Date.UTC(year, month - 1, day, 12));
}

function pad(value: number): string {
    return String(value).padStart(2, '0');
}

export function keyOf(year: number, month: number, day: number): string {
    return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Orthodox (Coptic) Easter Sunday of a Gregorian year (Meeus' Julian algorithm, then +13 days).
 */
export function orthodoxEaster(year: number): Date {
    const a = year % 4;
    const b = year % 7;
    const c = year % 19;
    const d = (19 * c + 15) % 30;
    const e = (2 * a + 4 * b - d + 34) % 7;
    const month = Math.floor((d + e + 114) / 31);
    const day = ((d + e + 114) % 31) + 1;
    const julian = Date.UTC(year, month - 1, day, 12);

    return new Date(julian + 13 * 86_400_000);
}

interface HijriRule {
    month: number;
    day: number;
    key: string;
    title: Localized;
    description?: Localized;
    /** How many days it lasts (Eid). */
    length?: number;
}

const hijriRules: HijriRule[] = [
    { month: 1, day: 1, key: 'hijri-new-year', title: { ar: 'رأس السنة الهجرية', en: 'Islamic New Year' } },
    { month: 1, day: 9, key: 'tasua', title: { ar: 'تاسوعاء', en: "Tasu'a" }, description: { ar: 'يُستحب صيامه مع عاشوراء.', en: 'Recommended fast with Ashura.' } },
    { month: 1, day: 10, key: 'ashura', title: { ar: 'عاشوراء', en: 'Ashura' }, description: { ar: 'صيامه يكفّر السنة الماضية.', en: 'Its fast expiates the past year.' } },
    { month: 3, day: 12, key: 'mawlid', title: { ar: 'المولد النبوي', en: "Prophet's Birthday" } },
    { month: 7, day: 27, key: 'isra', title: { ar: 'الإسراء والمعراج', en: "Isra' and Mi'raj" } },
    { month: 8, day: 15, key: 'mid-shaban', title: { ar: 'ليلة النصف من شعبان', en: "Mid-Sha'ban night" } },
    { month: 9, day: 1, key: 'ramadan-start', title: { ar: 'أول أيام رمضان', en: 'First day of Ramadan' }, description: { ar: 'رمضان كريم، تقبّل الله صيامكم.', en: 'Ramadan Kareem.' } },
    { month: 9, day: 21, key: 'last-ten', title: { ar: 'بداية العشر الأواخر', en: 'Start of the last ten nights' } },
    { month: 9, day: 27, key: 'qadr', title: { ar: 'ليلة القدر (المرجّحة)', en: 'Laylat al-Qadr (likely)' }, description: { ar: 'تُلتمس في الوتر من العشر الأواخر.', en: 'Sought in the odd nights of the last ten.' } },
    { month: 10, day: 1, key: 'eid-fitr', title: { ar: 'عيد الفطر', en: 'Eid al-Fitr' }, length: 3 },
    { month: 12, day: 8, key: 'tarwiyah', title: { ar: 'يوم التروية', en: 'Day of Tarwiyah' } },
    { month: 12, day: 9, key: 'arafah', title: { ar: 'يوم عرفة', en: 'Day of Arafah' }, description: { ar: 'صيامه يكفّر سنتين لغير الحاج.', en: 'Its fast expiates two years for non-pilgrims.' } },
    { month: 12, day: 10, key: 'eid-adha', title: { ar: 'عيد الأضحى', en: 'Eid al-Adha' }, length: 4 },
];

interface GregorianRule {
    month: number;
    day: number;
    key: string;
    title: Localized;
    kind: OccasionKind;
}

/**
 * National holidays of Egypt (the platform's home) and the seasons.
 */
const gregorianRules: GregorianRule[] = [
    { month: 1, day: 1, key: 'new-year', title: { ar: 'رأس السنة الميلادية', en: "New Year's Day" }, kind: 'national' },
    { month: 1, day: 7, key: 'coptic-christmas', title: { ar: 'عيد الميلاد المجيد (إجازة رسمية)', en: 'Coptic Christmas (public holiday)' }, kind: 'national' },
    { month: 1, day: 25, key: 'jan-25', title: { ar: 'عيد الشرطة وثورة 25 يناير', en: 'Police Day and 25 January Revolution' }, kind: 'national' },
    { month: 3, day: 21, key: 'mothers-day', title: { ar: 'عيد الأم', en: "Mother's Day" }, kind: 'national' },
    { month: 4, day: 25, key: 'sinai', title: { ar: 'عيد تحرير سيناء', en: 'Sinai Liberation Day' }, kind: 'national' },
    { month: 5, day: 1, key: 'labour', title: { ar: 'عيد العمال', en: 'Labour Day' }, kind: 'national' },
    { month: 6, day: 30, key: 'jun-30', title: { ar: 'ذكرى 30 يونيو', en: '30 June' }, kind: 'national' },
    { month: 7, day: 23, key: 'jul-23', title: { ar: 'ثورة 23 يوليو', en: '23 July Revolution' }, kind: 'national' },
    { month: 10, day: 6, key: 'oct-6', title: { ar: 'عيد القوات المسلحة (نصر أكتوبر)', en: 'Armed Forces Day (6 October)' }, kind: 'national' },
    { month: 3, day: 20, key: 'spring', title: { ar: 'بداية فصل الربيع', en: 'First day of spring' }, kind: 'season' },
    { month: 6, day: 21, key: 'summer', title: { ar: 'بداية فصل الصيف', en: 'First day of summer' }, kind: 'season' },
    { month: 9, day: 22, key: 'autumn', title: { ar: 'بداية فصل الخريف', en: 'First day of autumn' }, kind: 'season' },
    { month: 12, day: 21, key: 'winter', title: { ar: 'بداية فصل الشتاء', en: 'First day of winter' }, kind: 'season' },
];

const occasionCache = new Map<string, Map<string, Occasion[]>>();

/**
 * Every occasion of a Gregorian year, keyed by date.
 */
export function occasionsOfYear(year: number, timezone: string, locale: Locale): Map<string, Occasion[]> {
    const cacheKey = `${year}|${timezone}|${locale}`;
    const cached = occasionCache.get(cacheKey);

    if (cached) {
        return cached;
    }

    const byDate = new Map<string, Occasion[]>();
    const add = (key: string, occasion: Occasion) => {
        const list = byDate.get(key) ?? [];
        list.push(occasion);
        byDate.set(key, list);
    };

    for (const rule of gregorianRules) {
        const key = keyOf(year, rule.month, rule.day);
        add(key, { date: key, title: rule.title, kind: rule.kind, key: rule.key });
    }

    // Sham El-Nessim: the Monday after Coptic Easter.
    const easter = orthodoxEaster(year);
    const shamElNessim = new Date(easter.getTime() + 86_400_000);
    const easterKey = keyOf(easter.getUTCFullYear(), easter.getUTCMonth() + 1, easter.getUTCDate());
    const shamKey = keyOf(shamElNessim.getUTCFullYear(), shamElNessim.getUTCMonth() + 1, shamElNessim.getUTCDate());
    add(easterKey, { date: easterKey, title: { ar: 'عيد القيامة المجيد', en: 'Coptic Easter' }, kind: 'national', key: 'easter' });
    add(shamKey, { date: shamKey, title: { ar: 'شم النسيم', en: 'Sham El-Nessim' }, kind: 'national', key: 'sham-el-nessim' });

    // Islamic occasions: walk the year day by day and match the Hijri rules.
    const start = Date.UTC(year, 0, 1, 12);
    const end = Date.UTC(year + 1, 0, 1, 12);
    let previous: HijriDate | null = null;

    for (let time = start; time < end; time += 86_400_000) {
        const date = new Date(time);
        const hijri = hijriOf(date, 'UTC', locale);
        const key = keyOf(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());

        for (const rule of hijriRules) {
            if (hijri.month !== rule.month) {
                continue;
            }

            const length = rule.length ?? 1;

            if (hijri.day >= rule.day && hijri.day < rule.day + length) {
                const dayNumber = hijri.day - rule.day + 1;

                add(key, {
                    date: key,
                    title: length > 1 ? { ar: `${rule.title.ar} (اليوم ${dayNumber})`, en: `${rule.title.en} (day ${dayNumber})` } : rule.title,
                    kind: 'islamic',
                    key: rule.key,
                    day: length > 1 ? dayNumber : undefined,
                    description: rule.description,
                });
            }
        }

        // The last day of Ramadan: the day before 1 Shawwal.
        if (previous && previous.month === 9 && hijri.month === 10 && hijri.day === 1) {
            const before = new Date(time - 86_400_000);
            const beforeKey = keyOf(before.getUTCFullYear(), before.getUTCMonth() + 1, before.getUTCDate());
            add(beforeKey, { date: beforeKey, title: { ar: 'آخر أيام رمضان', en: 'Last day of Ramadan' }, kind: 'islamic', key: 'ramadan-end' });
        }

        previous = hijri;
    }

    occasionCache.set(cacheKey, byDate);

    return byDate;
}

/**
 * The 6 weeks shown for a Gregorian month (Saturday first), with the Hijri date and the
 * occasions of every day.
 */
export function monthGrid(year: number, month: number, timezone: string, locale: Locale): CalendarDay[] {
    const first = noon(year, month, 1);
    const firstWeekday = first.getUTCDay();
    const offset = weekOrder.indexOf(firstWeekday);
    const occasions = new Map<string, Occasion[]>([...occasionsOfYear(year - 1, timezone, locale), ...occasionsOfYear(year, timezone, locale), ...occasionsOfYear(year + 1, timezone, locale)]);
    const days: CalendarDay[] = [];

    for (let index = 0; index < 42; index++) {
        const date = new Date(first.getTime() + (index - offset) * 86_400_000);
        const key = keyOf(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());

        days.push({
            key,
            date,
            day: date.getUTCDate(),
            weekday: date.getUTCDay(),
            inMonth: date.getUTCMonth() + 1 === month,
            hijri: hijriOf(date, 'UTC', locale),
            occasions: occasions.get(key) ?? [],
        });
    }

    // Drop a trailing week that holds no day of the month.
    return days.slice(35).some((day) => day.inMonth) ? days : days.slice(0, 35);
}

/**
 * The occasions from a date onwards, soonest first.
 */
export function upcomingOccasions(fromKey: string, timezone: string, locale: Locale, limit = 12): Occasion[] {
    const year = Number(fromKey.slice(0, 4));
    const all = [...occasionsOfYear(year, timezone, locale).values(), ...occasionsOfYear(year + 1, timezone, locale).values()].flat();

    return all
        .filter((occasion) => occasion.date >= fromKey)
        .sort((a, b) => a.date.localeCompare(b.date))
        .filter((occasion, index, list) => index === 0 || occasion.key !== list[index - 1].key || occasion.date !== list[index - 1].date)
        .slice(0, limit);
}
