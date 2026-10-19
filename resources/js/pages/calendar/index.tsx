import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, Info, Moon, MoonStar, Flag, Leaf, Sparkles, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type CalendarDay, dayKey, hijriMonths, hijriOf, monthGrid, noon, type Occasion, type OccasionKind, upcomingOccasions, weekOrder } from '@/lib/calendar';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { localized } from '@/lib/prayers';
import { cn } from '@/lib/utils';

interface CalendarProps {
    timezone: string;
    country: string | null;
}

const kindStyles: Record<OccasionKind, { icon: LucideIcon; dot: string; chip: string }> = {
    islamic: { icon: MoonStar, dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-800 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-200' },
    national: { icon: Flag, dot: 'bg-gold-500', chip: 'bg-gold-50 text-gold-800 ring-gold-600/20 dark:bg-gold-500/10 dark:text-gold-200' },
    season: { icon: Leaf, dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-800 ring-sky-600/15 dark:bg-sky-500/10 dark:text-sky-200' },
};

/**
 * The Gregorian and Hijri calendar, month by month, with the Islamic occasions, the national
 * holidays and the seasons, like the calendar of a phone.
 */
export default function Calendar({ timezone }: CalendarProps) {
    const { t, locale } = useTrans();
    const dates = useDates();
    const todayKey = dayKey(new Date(), timezone);
    const [year, setYear] = useState(() => Number(todayKey.slice(0, 4)));
    const [month, setMonth] = useState(() => Number(todayKey.slice(5, 7)));
    const [primary, setPrimary] = useState<'gregorian' | 'hijri'>('gregorian');
    const [selectedKey, setSelectedKey] = useState(todayKey);

    const days = useMemo(() => monthGrid(year, month, timezone, locale), [year, month, timezone, locale]);
    const selected = days.find((day) => day.key === selectedKey) ?? days.find((day) => day.key === todayKey) ?? days[0];
    const monthOccasions = days.filter((day) => day.inMonth && day.occasions.length > 0);
    const upcoming = useMemo(() => upcomingOccasions(todayKey, timezone, locale), [todayKey, timezone, locale]);

    const monthDate = noon(year, month, 1);
    const hijriStart = hijriOf(days.find((day) => day.inMonth)?.date ?? monthDate, 'UTC', locale);
    const hijriEnd = hijriOf([...days].reverse().find((day) => day.inMonth)?.date ?? monthDate, 'UTC', locale);
    const hijriRange =
        hijriStart.month === hijriEnd.month
            ? `${hijriStart.monthName} ${hijriStart.year}`
            : `${hijriStart.monthName} – ${hijriEnd.monthName} ${hijriEnd.year}`;

    const shift = (delta: number) => {
        const next = new Date(Date.UTC(year, month - 1 + delta, 1, 12));
        setYear(next.getUTCFullYear());
        setMonth(next.getUTCMonth() + 1);
    };

    const goToday = () => {
        setYear(Number(todayKey.slice(0, 4)));
        setMonth(Number(todayKey.slice(5, 7)));
        setSelectedKey(todayKey);
    };

    const gregorianMonth = dates.date(monthDate, { month: 'long', year: 'numeric', day: undefined });

    return (
        <AppLayout
            title={t('Calendar')}
            description={t('The Gregorian and Hijri dates side by side, with the Islamic occasions, the national holidays and the seasons.')}
            actions={
                <div className="flex items-center gap-2">
                    <div className="inline-flex rounded-xl border border-line bg-surface-muted p-1">
                        {(['gregorian', 'hijri'] as const).map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => setPrimary(option)}
                                className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold transition', primary === option ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink')}
                            >
                                {option === 'gregorian' ? t('Gregorian first') : t('Hijri first')}
                            </button>
                        ))}
                    </div>
                    <Button variant="secondary" size="sm" onClick={goToday}>
                        <CalendarDays />
                        {t('Today')}
                    </Button>
                </div>
            }
        >
            <div className="grid gap-6 xl:grid-cols-3">
                <Card className="overflow-hidden xl:col-span-2">
                    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
                        <button type="button" onClick={() => shift(-1)} className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface text-ink transition hover:border-line-strong" aria-label={t('Previous month')}>
                            <ChevronRight className="size-5 ltr:rotate-180" />
                        </button>
                        <div className="min-w-0 text-center">
                            <h2 className="truncate text-lg font-bold text-ink sm:text-xl">{primary === 'gregorian' ? gregorianMonth : hijriRange}</h2>
                            <p className="truncate text-sm text-muted">{primary === 'gregorian' ? hijriRange : gregorianMonth}</p>
                        </div>
                        <button type="button" onClick={() => shift(1)} className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface text-ink transition hover:border-line-strong" aria-label={t('Next month')}>
                            <ChevronLeft className="size-5 ltr:rotate-180" />
                        </button>
                    </div>

                    <div className="grid grid-cols-7 border-b border-line bg-surface-muted/60 text-center text-[11px] font-semibold text-muted sm:text-xs">
                        {weekOrder.map((weekday) => (
                            <div key={weekday} className={cn('py-2', weekday === 5 && 'text-primary-700 dark:text-primary-300')}>
                                <span className="sm:hidden">{dates.dayName(weekday, 'short')}</span>
                                <span className="hidden sm:inline">{dates.dayName(weekday)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-px bg-line">
                        {days.map((day) => (
                            <DayCell key={day.key} day={day} today={day.key === todayKey} selected={day.key === selected?.key} primary={primary} onSelect={() => setSelectedKey(day.key)} />
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-xs text-muted sm:px-5">
                        {(Object.keys(kindStyles) as OccasionKind[]).map((kind) => (
                            <span key={kind} className="inline-flex items-center gap-1.5">
                                <span className={cn('size-2 rounded-full', kindStyles[kind].dot)} />
                                {kind === 'islamic' ? t('Islamic occasions') : kind === 'national' ? t('National holidays') : t('Seasons')}
                            </span>
                        ))}
                    </div>
                </Card>

                <div className="space-y-6">
                    {selected && <SelectedDay day={selected} today={selected.key === todayKey} />}

                    <Card>
                        <CardHeader title={t('Occasions this month')} icon={Sparkles} />
                        {monthOccasions.length === 0 ? (
                            <p className="px-5 py-6 text-center text-sm text-muted">{t('No occasions this month.')}</p>
                        ) : (
                            <ul className="divide-y divide-line">
                                {monthOccasions.map((day) =>
                                    day.occasions.map((occasion) => (
                                        <OccasionRow key={`${day.key}-${occasion.key}`} occasion={occasion} day={day} onSelect={() => setSelectedKey(day.key)} />
                                    )),
                                )}
                            </ul>
                        )}
                    </Card>

                    <Card>
                        <CardHeader title={t('Coming up')} icon={CalendarRange} description={t('The next occasions from today')} />
                        <ul className="divide-y divide-line">
                            {upcoming.map((occasion) => (
                                <OccasionRow key={`${occasion.date}-${occasion.key}`} occasion={occasion} onSelect={() => {
                                    setYear(Number(occasion.date.slice(0, 4)));
                                    setMonth(Number(occasion.date.slice(5, 7)));
                                    setSelectedKey(occasion.date);
                                }} />
                            ))}
                        </ul>
                    </Card>

                    <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
                        <Info className="mt-0.5 size-4 shrink-0" />
                        {t('Hijri dates follow the Umm al-Qura calendar; the actual start of a month may differ by a day depending on the moon sighting in your country.')}
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}

function DayCell({ day, today, selected, primary, onSelect }: { day: CalendarDay; today: boolean; selected: boolean; primary: 'gregorian' | 'hijri'; onSelect: () => void }) {
    const { locale } = useTrans();
    const friday = day.weekday === 5;
    const big = primary === 'gregorian' ? day.day : day.hijri.day;
    const small = primary === 'gregorian' ? (day.hijri.day === 1 ? `${day.hijri.day} ${day.hijri.monthName}` : String(day.hijri.day)) : String(day.day);

    return (
        <button
            type="button"
            onClick={onSelect}
            className={cn(
                'flex min-h-16 flex-col items-stretch gap-1 bg-surface p-1.5 text-start transition hover:bg-surface-muted/70 sm:min-h-24 sm:p-2',
                !day.inMonth && 'bg-surface-muted/40 text-muted',
                selected && 'ring-2 ring-inset ring-primary-500',
            )}
        >
            <span className="flex items-start justify-between gap-1">
                <span
                    className={cn(
                        'flex size-7 items-center justify-center rounded-full text-sm font-bold tabular-nums sm:size-8 sm:text-base',
                        today ? 'bg-primary-600 text-white' : day.inMonth ? (friday ? 'text-primary-700 dark:text-primary-300' : 'text-ink') : 'text-muted',
                    )}
                >
                    {big}
                </span>
                <span
                    className={cn(
                        'text-[10px] font-semibold tabular-nums sm:text-[11px]',
                        day.hijri.day === 1 && primary === 'gregorian' ? 'truncate text-gold-600 dark:text-gold-400' : 'shrink-0 whitespace-nowrap text-muted',
                    )}
                >
                    {small}
                </span>
            </span>
            {day.occasions.length > 0 && (
                <span className="flex flex-col gap-0.5">
                    {day.occasions.slice(0, 2).map((occasion) => (
                        <span key={occasion.key} className={cn('hidden truncate rounded-md px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset sm:block', kindStyles[occasion.kind].chip)}>
                            {localized(occasion.title, locale)}
                        </span>
                    ))}
                    <span className="flex gap-1 sm:hidden">
                        {day.occasions.slice(0, 3).map((occasion) => (
                            <span key={occasion.key} className={cn('size-1.5 rounded-full', kindStyles[occasion.kind].dot)} />
                        ))}
                    </span>
                    {day.occasions.length > 2 && <span className="hidden text-[10px] text-muted sm:block">+{day.occasions.length - 2}</span>}
                </span>
            )}
        </button>
    );
}

function SelectedDay({ day, today }: { day: CalendarDay; today: boolean }) {
    const { t, locale } = useTrans();
    const dates = useDates();

    return (
        <Card className="relative overflow-hidden p-5">
            <p className="text-xs font-semibold text-gold-600 dark:text-gold-400">{today ? t('Today') : dates.dayName(day.weekday)}</p>
            <div className="mt-2 flex items-start gap-4">
                <div className="min-w-0 flex-1">
                    <p className="text-2xl font-bold text-ink">{dates.date(day.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-base font-semibold text-ink">
                        <Moon className="size-4 text-gold-500" />
                        {day.hijri.day} {day.hijri.monthName} {day.hijri.year} {locale === 'ar' ? 'هـ' : 'AH'}
                    </p>
                </div>
            </div>
            {day.occasions.length > 0 ? (
                <ul className="mt-4 space-y-2">
                    {day.occasions.map((occasion) => {
                        const Icon = kindStyles[occasion.kind].icon;

                        return (
                            <li key={occasion.key} className={cn('flex items-start gap-2.5 rounded-xl px-3 py-2 text-sm ring-1 ring-inset', kindStyles[occasion.kind].chip)}>
                                <Icon className="mt-0.5 size-4 shrink-0" />
                                <span>
                                    <span className="block font-semibold">{localized(occasion.title, locale)}</span>
                                    {occasion.description && <span className="block text-xs opacity-80">{localized(occasion.description, locale)}</span>}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            ) : (
                <p className="mt-4 text-sm text-muted">{t('No occasions on this day.')}</p>
            )}
        </Card>
    );
}

function OccasionRow({ occasion, day, onSelect }: { occasion: Occasion; day?: CalendarDay; onSelect: () => void }) {
    const { locale } = useTrans();
    const dates = useDates();
    const Icon = kindStyles[occasion.kind].icon;
    const date = day?.date ?? noon(Number(occasion.date.slice(0, 4)), Number(occasion.date.slice(5, 7)), Number(occasion.date.slice(8, 10)));
    const hijri = day?.hijri ?? hijriOf(date, 'UTC', locale);

    return (
        <li>
            <button type="button" onClick={onSelect} className="flex w-full items-center gap-3 px-5 py-2.5 text-start transition hover:bg-surface-muted/60">
                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset', kindStyles[occasion.kind].chip)}>
                    <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{localized(occasion.title, locale)}</span>
                    <span className="block truncate text-xs text-muted">
                        {dates.date(date, { weekday: 'short', day: 'numeric', month: 'short' })}
                        <span className="mx-1.5 text-line-strong">·</span>
                        {hijri.day} {hijriMonths[hijri.month - 1]?.[locale]}
                    </span>
                </span>
                <span className="shrink-0 text-xs text-muted">{dates.relative(date)}</span>
            </button>
        </li>
    );
}
