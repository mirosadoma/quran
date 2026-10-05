import { router } from '@inertiajs/react';
import { ArrowDownRight, ArrowUpRight, ChartLine, HandHeart, Minus, Sparkles, TriangleAlert, Scale } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { DeedsTrendChart } from '@/components/charts';
import { SeverityBadge } from '@/components/deeds/deed-form';
import { DeedsShell } from '@/components/deeds/deeds-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/form';
import { useDates } from '@/lib/dates';
import { type DayCounts, findEntry, type SinSeverity } from '@/lib/deeds';
import { useTrans } from '@/lib/i18n';
import { localized } from '@/lib/prayers';
import { cn, formatNumber } from '@/lib/utils';

type Range = 'day' | 'week' | 'month' | 'custom';
type Totals = Omit<DayCounts, 'date'>;

interface ReportsProps {
    range: Range;
    from: string;
    to: string;
    today: string;
    days: DayCounts[];
    totals: Totals;
    previous: Totals;
    trend: 'up' | 'down' | 'steady' | null;
    topSins: { key: string | null; severity: SinSeverity | null; count: number; unrepented: number }[];
}

/**
 * How the deeds changed over a period, with the chart of the state of faith.
 */
export default function DeedReports({ range, from, to, today, days, totals, previous, trend, topSins }: ReportsProps) {
    const { t, locale } = useTrans();
    const dates = useDates();
    const [custom, setCustom] = useState({ from, to });

    const go = (next: Range, period?: { from: string; to: string }) => {
        router.get(route('deeds.reports'), { range: next, ...(next === 'custom' ? period : {}) }, { preserveScroll: true, preserveState: true });
    };

    const applyCustom = (event: FormEvent) => {
        event.preventDefault();
        go('custom', custom);
    };

    const ranges: { value: Range; label: string }[] = [
        { value: 'day', label: t('Today') },
        { value: 'week', label: t('Week') },
        { value: 'month', label: t('Month') },
        { value: 'custom', label: t('Custom') },
    ];

    return (
        <DeedsShell tab="reports">
            <Card className="mb-6 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="grid grid-cols-4 gap-1 rounded-xl bg-surface-muted p-1 text-sm font-semibold sm:w-fit">
                        {ranges.map((item) => (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => (item.value === 'custom' ? go('custom', custom) : go(item.value))}
                                className={cn('rounded-lg px-4 py-2 transition', range === item.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={applyCustom} className="flex flex-wrap items-center gap-2">
                        <Input type="date" value={custom.from} max={today} onChange={(event) => setCustom((value) => ({ ...value, from: event.target.value }))} className="w-auto flex-1 sm:flex-none" aria-label={t('From')} />
                        <span className="text-sm text-muted">{t('to')}</span>
                        <Input type="date" value={custom.to} max={today} onChange={(event) => setCustom((value) => ({ ...value, to: event.target.value }))} className="w-auto flex-1 sm:flex-none" aria-label={t('To')} />
                        <Button type="submit" variant="secondary">
                            {t('Show')}
                        </Button>
                    </form>
                </div>
                <p className="mt-3 text-xs text-muted">
                    {from === to ? dates.day(from, { weekday: 'long' }) : t(':from to :to', { from: dates.day(from), to: dates.day(to) })}
                </p>
            </Card>

            <TrendBanner trend={trend} net={totals.net} />

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat icon={Sparkles} tone="emerald" label={t('Good deeds')} value={totals.good} previous={previous.good} />
                <Stat icon={TriangleAlert} tone="rose" label={t('Sins')} value={totals.bad} previous={previous.bad} lowerIsBetter note={totals.major > 0 ? t(':count of them major', { count: formatNumber(totals.major, locale) }) : undefined} />
                <Stat icon={HandHeart} tone="sky" label={t('Repented or expiated')} value={totals.repented} previous={previous.repented} />
                <Stat icon={Scale} tone="gold" label={t('Not repented yet')} value={totals.unrepented} previous={previous.unrepented} lowerIsBetter />
            </div>

            <Card className="mt-6 p-5">
                <h2 className="mb-1 flex items-center gap-2 font-bold text-ink">
                    <ChartLine className="size-5 text-primary-600" />
                    {t('Your state of faith day by day')}
                </h2>
                <p className="mb-4 text-xs leading-relaxed text-muted">
                    {t('Good deeds and the sins you repented of count together above the line; the sins left without repentance count below it.')}
                </p>
                <DeedsTrendChart data={days} />
            </Card>

            <Card className="mt-6 p-5">
                <h2 className="mb-4 font-bold text-ink">{t('The sins you fall into most')}</h2>
                {topSins.length === 0 ? (
                    <p className="text-sm text-muted">{t('No sins recorded in this period. Praise be to Allah.')}</p>
                ) : (
                    <ul className="divide-y divide-line">
                        {topSins.map((item) => {
                            const entry = findEntry('bad', item.key);

                            return (
                                <li key={item.key ?? 'other'} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                                    <span className="min-w-0 flex-1 font-semibold text-ink">{entry ? localized(entry.name, locale) : t('Other sins')}</span>
                                    <SeverityBadge severity={item.severity} />
                                    <span className="text-sm text-muted tabular-nums">{t(':count times', { count: formatNumber(item.count, locale) })}</span>
                                    {item.unrepented > 0 && (
                                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                                            {t(':count not repented yet', { count: formatNumber(item.unrepented, locale) })}
                                        </span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </Card>
        </DeedsShell>
    );
}

function TrendBanner({ trend, net }: { trend: ReportsProps['trend']; net: number }) {
    const { t, locale } = useTrans();

    const states = {
        up: { icon: ArrowUpRight, tone: 'from-emerald-600 to-primary-800', title: t('Your state is improving'), text: t('Your days are getting better: keep going and ask Allah for steadfastness.') },
        down: { icon: ArrowDownRight, tone: 'from-rose-600 to-rose-800', title: t('Your state is going down'), text: t('Turn back to Allah with repentance; follow every bad deed with a good one, it wipes it out.') },
        steady: { icon: Minus, tone: 'from-sky-600 to-sky-800', title: t('Your state is steady'), text: t('Add a little good every day, even small, and repent of every sin right away.') },
    } as const;

    if (trend === null) {
        return (
            <p className="rounded-2xl border border-dashed border-line-strong p-4 text-center text-sm text-muted">
                {t('Record your deeds on more days to see whether your state of faith is going up or down.')}
            </p>
        );
    }

    const state = states[trend];

    return (
        <div className={cn('flex items-center gap-4 rounded-3xl bg-linear-to-br p-5 text-white shadow-lg', state.tone)}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                <state.icon className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-lg font-bold">{state.title}</p>
                <p className="text-sm text-white/85">{state.text}</p>
            </div>
            <div className="text-center">
                <p className="text-xs text-white/75">{t('Net')}</p>
                <p className="text-2xl font-bold tabular-nums">{formatNumber(net, locale)}</p>
            </div>
        </div>
    );
}

const tones = {
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300',
    gold: 'bg-gold-50 text-gold-600 dark:bg-gold-500/10 dark:text-gold-300',
};

function Stat({
    icon: Icon,
    tone,
    label,
    value,
    previous,
    lowerIsBetter = false,
    note,
}: {
    icon: typeof Sparkles;
    tone: keyof typeof tones;
    label: string;
    value: number;
    previous: number;
    lowerIsBetter?: boolean;
    note?: string;
}) {
    const { t, locale } = useTrans();
    const change = value - previous;
    const good = lowerIsBetter ? change < 0 : change > 0;

    return (
        <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-3">
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
                    <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                    <p className="truncate text-xs text-muted">{label}</p>
                    <p className="text-2xl font-bold text-ink tabular-nums">{formatNumber(value, locale)}</p>
                </div>
            </div>
            {change !== 0 && (
                <p className={cn('mt-2 text-xs font-semibold', good ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300')}>
                    {change > 0 ? '▲' : '▼'} {t(':count than the previous period', { count: formatNumber(Math.abs(change), locale) })}
                </p>
            )}
            {note && <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-300">{note}</p>}
        </div>
    );
}
