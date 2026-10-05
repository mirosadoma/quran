import { Link, router, usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, CircleCheck, HandHeart, NotebookPen, Plus, Sparkles, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { DeedForm, currentTime } from '@/components/deeds/deed-form';
import { DeedRow } from '@/components/deeds/deed-row';
import { DeedsShell } from '@/components/deeds/deeds-shell';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { useDates } from '@/lib/dates';
import type { DayCounts, DeedItem } from '@/lib/deeds';
import { useTrans } from '@/lib/i18n';
import { cn, formatNumber } from '@/lib/utils';

interface DeedsProps {
    date: string;
    today: string;
    deeds: DeedItem[];
    summary: DayCounts;
    week: DayCounts[];
}

function shiftDay(date: string, days: number): string {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);

    return value.toISOString().slice(0, 10);
}

/**
 * Self-accounting, day by day: record what you did, repent of every sin.
 */
export default function Deeds({ date, today, deeds, summary, week }: DeedsProps) {
    const { t, locale } = useTrans();
    const dates = useDates();
    const [editing, setEditing] = useState<DeedItem | null>(null);
    const isToday = date === today;

    return (
        <DeedsShell tab="day">
            <div className="mb-5 flex flex-wrap items-center gap-2">
                <Link
                    href={route('deeds.index', { date: shiftDay(date, -1) })}
                    preserveScroll
                    className="flex size-10 items-center justify-center rounded-xl border border-line bg-surface text-ink transition hover:border-line-strong"
                    aria-label={t('Previous day')}
                >
                    <ChevronRight className="size-5 ltr:rotate-180" />
                </Link>
                <div className="min-w-0 flex-1 text-center sm:flex-none sm:px-4 sm:text-start">
                    <p className="font-bold text-ink">{isToday ? t('Today') : dates.day(date, { weekday: 'long' })}</p>
                    <p className="text-xs text-muted">
                        {dates.hijri(new Date(`${date}T12:00:00Z`))} · {dates.day(date)}
                    </p>
                </div>
                <Link
                    href={route('deeds.index', { date: shiftDay(date, 1) })}
                    preserveScroll
                    className={cn(
                        'flex size-10 items-center justify-center rounded-xl border border-line bg-surface text-ink transition hover:border-line-strong',
                        isToday && 'pointer-events-none opacity-40',
                    )}
                    aria-label={t('Next day')}
                    aria-disabled={isToday}
                >
                    <ChevronLeft className="size-5 ltr:rotate-180" />
                </Link>
                {!isToday && (
                    <Link href={route('deeds.index')} className="text-sm font-semibold text-primary-700 hover:underline dark:text-primary-300">
                        {t('Back to today')}
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Counter icon={Sparkles} tone="emerald" label={t('Good deeds')} value={formatNumber(summary.good, locale)} />
                <Counter
                    icon={TriangleAlert}
                    tone="rose"
                    label={t('Sins')}
                    value={formatNumber(summary.bad, locale)}
                    note={summary.major > 0 ? t(':count of them major', { count: formatNumber(summary.major, locale) }) : undefined}
                />
                <Counter icon={HandHeart} tone="sky" label={t('Repented or expiated')} value={formatNumber(summary.repented, locale)} />
                <Counter icon={CircleCheck} tone={summary.unrepented > 0 ? 'gold' : 'emerald'} label={t('Not repented yet')} value={formatNumber(summary.unrepented, locale)} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-5">
                <div className="space-y-6 lg:col-span-2">
                    <Card className="p-5">
                        <h2 className="mb-4 flex items-center gap-2 font-bold text-ink">
                            <Plus className="size-5 text-primary-600" />
                            {t('Record a deed')}
                        </h2>
                        <DeedForm key={date} date={date} today={today} />
                    </Card>
                    <QuickGoodDeeds date={date} today={today} />
                    <WeekBars week={week} />
                </div>

                <div className="lg:col-span-3">
                    <h2 className="mb-3 flex items-center gap-2 font-bold text-ink">
                        <NotebookPen className="size-5 text-primary-600" />
                        {isToday ? t('Your deeds today') : t('Your deeds on this day')}
                    </h2>
                    {deeds.length === 0 ? (
                        <EmptyState icon={NotebookPen} title={t('Nothing recorded on this day')} description={t('Record your good deeds to thank Allah for them, and your sins to repent of them.')} />
                    ) : (
                        <ul className="space-y-3">
                            {deeds.map((deed) => (
                                <DeedRow key={deed.id} deed={deed} onEdit={setEditing} />
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <Modal open={editing !== null} onClose={() => setEditing(null)} title={t('Edit the deed')} size="md">
                {editing && <DeedForm date={editing.date} today={today} deed={editing} onDone={() => setEditing(null)} />}
            </Modal>
        </DeedsShell>
    );
}

const tones = {
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300',
    gold: 'bg-gold-50 text-gold-600 dark:bg-gold-500/10 dark:text-gold-300',
};

function Counter({ icon: Icon, tone, label, value, note }: { icon: typeof Sparkles; tone: keyof typeof tones; label: string; value: string; note?: string }) {
    return (
        <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-3">
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
                    <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-xs text-muted">{label}</p>
                    <p className="text-2xl font-bold text-ink tabular-nums">{value}</p>
                </div>
            </div>
            {note && <p className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-300">{note}</p>}
        </div>
    );
}

/**
 * One tap for the good deeds of every day.
 */
function QuickGoodDeeds({ date, today }: { date: string; today: string }) {
    const { t } = useTrans();
    const { timezone } = usePage().props;
    const [busy, setBusy] = useState<string | null>(null);

    const items = [
        { key: 'prayer-on-time', title: t('I prayed the prayers on time') },
        { key: 'quran', title: t('I read my portion of the Quran') },
        { key: 'dhikr', title: t('I said the morning and evening remembrances') },
        { key: 'sunnah-prayers', title: t('I prayed the regular Sunnah prayers') },
        { key: 'charity', title: t('I gave charity') },
        { key: 'parents', title: t('I was kind to my parents') },
        { key: 'qiyam', title: t('I prayed at night and witr') },
        { key: 'salawat', title: t('I sent prayers upon the Prophet ﷺ') },
    ];

    const record = (item: { key: string; title: string }) => {
        router.post(
            route('deeds.store'),
            { kind: 'good', title: item.title, catalog_key: item.key, date, time: date === today ? currentTime(timezone) : '12:00' },
            { preserveScroll: true, onStart: () => setBusy(item.key), onFinish: () => setBusy(null) },
        );
    };

    return (
        <Card className="p-5">
            <h2 className="mb-3 text-sm font-bold text-ink">{t('Quick good deeds')}</h2>
            <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        onClick={() => record(item)}
                        disabled={busy !== null}
                        className="rounded-full border border-emerald-200 bg-emerald-50/60 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200"
                    >
                        {busy === item.key ? '…' : '+'} {item.title}
                    </button>
                ))}
            </div>
        </Card>
    );
}

/**
 * The last seven days at a glance: green above, red below.
 */
function WeekBars({ week }: { week: DayCounts[] }) {
    const { t } = useTrans();
    const dates = useDates();
    const highest = Math.max(1, ...week.map((day) => Math.max(day.good + day.repented, day.unrepented)));

    return (
        <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-ink">{t('The last seven days')}</h2>
                <Link href={route('deeds.reports')} className="text-xs font-semibold text-primary-700 hover:underline dark:text-primary-300">
                    {t('Reports')}
                </Link>
            </div>
            <div className="grid grid-cols-7 gap-2">
                {week.map((day) => (
                    <Link key={day.date} href={route('deeds.index', { date: day.date })} className="group flex flex-col items-center gap-1" title={dates.day(day.date)}>
                        <div className="flex h-16 w-full items-end justify-center">
                            <span className="w-3 rounded-t bg-emerald-500 transition group-hover:bg-emerald-600" style={{ height: `${(100 * (day.good + day.repented)) / highest}%` }} />
                        </div>
                        <div className="flex h-10 w-full items-start justify-center border-t border-line">
                            <span className="w-3 rounded-b bg-rose-500" style={{ height: `${(100 * day.unrepented) / highest}%` }} />
                        </div>
                        <span className="text-[10px] text-muted">{dates.day(day.date, { weekday: 'short', day: undefined, month: undefined, year: undefined })}</span>
                    </Link>
                ))}
            </div>
        </Card>
    );
}
