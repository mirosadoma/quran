import { useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    ComposedChart,
    Line,
    ReferenceLine,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { useTheme } from '@/hooks/use-theme';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import type { DayCounts } from '@/lib/deeds';
import { cn, formatNumber } from '@/lib/utils';
import type { WeeklyAttendance, WeeklyMemorization } from '@/types';

/**
 * Validated categorical palette (scripts/validate_palette.js): light vs. white,
 * dark vs. the dark card surface. Slot 1 memorization / attendance, slot 2 revision.
 */
const palette = {
    light: { first: '#08704f', second: '#c4892a', grid: '#ece6da', axis: '#7a847f' },
    dark: { first: '#1f9e74', second: '#c0821f', grid: '#1e322c', axis: '#8da39a' },
};

function useChartColors() {
    const { isDark } = useTheme();

    return isDark ? palette.dark : palette.light;
}

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color?: string }[] }) {
    return (
        <div className="min-w-40 rounded-xl border border-line bg-surface px-3 py-2.5 text-xs shadow-xl">
            <p className="mb-1.5 font-semibold text-ink">{title}</p>
            {rows.map((row) => (
                <p key={row.label} className="flex items-center justify-between gap-4 py-0.5">
                    <span className="flex items-center gap-1.5 text-muted">
                        {row.color && <span className="size-2.5 rounded-sm" style={{ backgroundColor: row.color }} />}
                        {row.label}
                    </span>
                    <span className="font-semibold text-ink tabular-nums">{row.value}</span>
                </p>
            ))}
        </div>
    );
}

function DataToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
    const { t } = useTrans();

    return (
        <button type="button" onClick={onToggle} className="text-xs font-semibold text-primary-700 hover:underline dark:text-primary-300">
            {open ? t('Show chart') : t('Show as table')}
        </button>
    );
}

export function AttendanceTrendChart({ data, className }: { data: WeeklyAttendance[]; className?: string }) {
    const { t, locale } = useTrans();
    const dates = useDates();
    const colors = useChartColors();
    const [table, setTable] = useState(false);
    const label = (value: string) => dates.day(value, { year: undefined });
    const hasData = data.some((point) => point.rate !== null);

    return (
        <div className={className}>
            <div className="mb-2 flex justify-end">
                <DataToggle open={table} onToggle={() => setTable((value) => !value)} />
            </div>
            {table ? (
                <DataTable
                    headers={[t('Week starting'), t('Attendance rate'), t('Attended'), t('Absent')]}
                    rows={data.map((point) => [
                        label(point.label),
                        point.rate === null ? '-' : `${point.rate}%`,
                        formatNumber(point.attended, locale),
                        formatNumber(point.absent, locale),
                    ])}
                />
            ) : !hasData ? (
                <p className="flex h-56 items-center justify-center text-sm text-muted">{t('No attendance recorded in this period yet.')}</p>
            ) : (
                <div className="h-56" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
                            <defs>
                                <linearGradient id="attendance-fill" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={colors.first} stopOpacity={0.22} />
                                    <stop offset="100%" stopColor={colors.first} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid vertical={false} stroke={colors.grid} />
                            <XAxis dataKey="label" tickFormatter={label} tick={{ fill: colors.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: colors.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{ stroke: colors.axis, strokeDasharray: '4 4' }}
                                content={({ active, payload }) => {
                                    const point = payload?.[0]?.payload as WeeklyAttendance | undefined;

                                    if (!active || !point) {
                                        return null;
                                    }

                                    return (
                                        <TooltipBox
                                            title={label(point.label)}
                                            rows={[
                                                { label: t('Attendance rate'), value: point.rate === null ? '-' : `${point.rate}%`, color: colors.first },
                                                { label: t('Attended'), value: formatNumber(point.attended, locale) },
                                                { label: t('Absent'), value: formatNumber(point.absent, locale) },
                                            ]}
                                        />
                                    );
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="rate"
                                stroke={colors.first}
                                strokeWidth={2}
                                fill="url(#attendance-fill)"
                                dot={{ r: 3.5, fill: colors.first, strokeWidth: 2, stroke: 'var(--surface)' }}
                                activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)' }}
                                connectNulls
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

export function MemorizationTrendChart({ data, className }: { data: WeeklyMemorization[]; className?: string }) {
    const { t, locale } = useTrans();
    const dates = useDates();
    const colors = useChartColors();
    const [table, setTable] = useState(false);
    const label = (value: string) => dates.day(value, { year: undefined });
    const hasData = data.some((point) => point.memorized > 0 || point.revised > 0);

    return (
        <div className={className}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-4 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm" style={{ backgroundColor: colors.first }} />
                        {t('Memorization')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm" style={{ backgroundColor: colors.second }} />
                        {t('Revision')}
                    </span>
                </div>
                <DataToggle open={table} onToggle={() => setTable((value) => !value)} />
            </div>
            {table ? (
                <DataTable
                    headers={[t('Week starting'), t('Memorization'), t('Revision')]}
                    rows={data.map((point) => [label(point.label), formatNumber(point.memorized, locale), formatNumber(point.revised, locale)])}
                />
            ) : !hasData ? (
                <p className="flex h-56 items-center justify-center text-sm text-muted">{t('No recitations recorded in this period yet.')}</p>
            ) : (
                <div className="h-56" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -14 }} barGap={2} barCategoryGap="28%">
                            <CartesianGrid vertical={false} stroke={colors.grid} />
                            <XAxis dataKey="label" tickFormatter={label} tick={{ fill: colors.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                            <YAxis allowDecimals={false} tick={{ fill: colors.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{ fill: colors.grid, opacity: 0.5 }}
                                content={({ active, payload }) => {
                                    const point = payload?.[0]?.payload as WeeklyMemorization | undefined;

                                    if (!active || !point) {
                                        return null;
                                    }

                                    return (
                                        <TooltipBox
                                            title={label(point.label)}
                                            rows={[
                                                { label: t('Memorization'), value: t(':count ayahs', { count: point.memorized }), color: colors.first },
                                                { label: t('Revision'), value: t(':count ayahs', { count: point.revised }), color: colors.second },
                                            ]}
                                        />
                                    );
                                }}
                            />
                            <Bar dataKey="memorized" fill={colors.first} radius={[4, 4, 0, 0]} maxBarSize={22} />
                            <Bar dataKey="revised" fill={colors.second} radius={[4, 4, 0, 0]} maxBarSize={22} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

/**
 * Day by day: good deeds and repented sins rise above the line, sins not repented of yet go below
 * it, and the net line shows whether the days get better or worse.
 */
export function DeedsTrendChart({ data, className }: { data: DayCounts[]; className?: string }) {
    const { t, locale } = useTrans();
    const dates = useDates();
    const colors = useChartColors();
    const { isDark } = useTheme();
    const [table, setTable] = useState(false);
    const negative = isDark ? '#e0607a' : '#c8344f';
    const label = (value: string) => dates.day(value, { year: undefined });
    const hasData = data.some((day) => day.good + day.bad > 0);
    const rows = data.map((day) => ({ ...day, positive: day.good + day.repented, negative: -day.unrepented }));

    return (
        <div className={className}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm" style={{ backgroundColor: colors.first }} />
                        {t('Good deeds and repented sins')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="size-2.5 rounded-sm" style={{ backgroundColor: negative }} />
                        {t('Sins not repented of yet')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: colors.second }} />
                        {t('Net')}
                    </span>
                </div>
                <DataToggle open={table} onToggle={() => setTable((value) => !value)} />
            </div>
            {table ? (
                <DataTable
                    headers={[t('Day'), t('Good deeds'), t('Sins'), t('Repented'), t('Not repented yet'), t('Net')]}
                    rows={data.map((day) => [
                        label(day.date),
                        formatNumber(day.good, locale),
                        formatNumber(day.bad, locale),
                        formatNumber(day.repented, locale),
                        formatNumber(day.unrepented, locale),
                        formatNumber(day.net, locale),
                    ])}
                />
            ) : !hasData ? (
                <p className="flex h-64 items-center justify-center text-center text-sm text-muted">{t('Nothing recorded in this period yet.')}</p>
            ) : (
                <div className="h-64" dir="ltr">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} stackOffset="sign" barCategoryGap="24%">
                            <CartesianGrid vertical={false} stroke={colors.grid} />
                            <XAxis dataKey="date" tickFormatter={label} tick={{ fill: colors.axis, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={12} />
                            <YAxis allowDecimals={false} tick={{ fill: colors.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                            <ReferenceLine y={0} stroke={colors.axis} strokeOpacity={0.5} />
                            <Tooltip
                                cursor={{ fill: colors.grid, opacity: 0.5 }}
                                content={({ active, payload }) => {
                                    const day = payload?.[0]?.payload as DayCounts | undefined;

                                    if (!active || !day) {
                                        return null;
                                    }

                                    return (
                                        <TooltipBox
                                            title={label(day.date)}
                                            rows={[
                                                { label: t('Good deeds'), value: formatNumber(day.good, locale), color: colors.first },
                                                { label: t('Repented sins'), value: formatNumber(day.repented, locale), color: colors.first },
                                                { label: t('Sins not repented of yet'), value: formatNumber(day.unrepented, locale), color: negative },
                                                { label: t('Net'), value: formatNumber(day.net, locale), color: colors.second },
                                            ]}
                                        />
                                    );
                                }}
                            />
                            <Bar dataKey="positive" stackId="deeds" fill={colors.first} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
                            <Bar dataKey="negative" stackId="deeds" fill={negative} radius={[0, 0, 4, 4]} maxBarSize={26} isAnimationActive={false} />
                            <Line type="linear" dataKey="net" stroke={colors.second} strokeWidth={2.5} dot={{ r: 3, fill: colors.second, strokeWidth: 0 }} activeDot={{ r: 5 }} isAnimationActive={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
    return (
        <div className="max-h-56 overflow-auto rounded-xl border border-line">
            <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface-muted">
                    <tr>
                        {headers.map((header) => (
                            <th key={header} className="px-3 py-2 text-start font-semibold text-muted">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={index} className={cn('border-t border-line')}>
                            {row.map((cell, cellIndex) => (
                                <td key={cellIndex} className="px-3 py-2 text-ink tabular-nums">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
