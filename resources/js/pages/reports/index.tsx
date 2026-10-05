import { Link } from '@inertiajs/react';
import { ArrowLeft, BookOpenCheck, CalendarCheck, CalendarX, ChartColumn, ClipboardCheck, Percent, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import { cn, colorOf, formatNumber } from '@/lib/utils';

interface HalaqaRow {
    id: number;
    name: string;
    color: string;
    is_active: boolean;
    teacher: string | null;
    students_count: number;
    attendance_rate: number | null;
    memorized: number;
    sessions_completed: number;
    sessions_cancelled: number;
}

interface ReportsIndexProps {
    overview: { attendance_rate: number | null; memorized: number; sessions_completed: number; sessions_cancelled: number };
    halaqat: HalaqaRow[];
}

function ReportLink({ href, icon: Icon, title, description }: { href: string; icon: typeof ChartColumn; title: string; description: ReactNode }) {
    return (
        <Link
            href={href}
            className="group flex items-start gap-4 rounded-2xl border border-line bg-surface p-5 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-lg hover:shadow-primary-950/5"
        >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                <Icon className="size-6" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block font-bold text-ink">{title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">{description}</span>
            </span>
            <ArrowLeft className="mt-1 size-5 text-muted transition group-hover:text-primary-600 ltr:rotate-180" />
        </Link>
    );
}

export default function ReportsIndex({ overview, halaqat }: ReportsIndexProps) {
    const { t, locale } = useTrans();

    const rateClass = (rate: number | null) =>
        rate === null ? 'text-muted' : rate >= 80 ? 'text-emerald-600' : rate >= 60 ? 'text-amber-600' : 'text-rose-600';

    return (
        <AppLayout title={t('Reports')} description={t('Attendance and memorization reports with export and printing.')}>
            <div className="grid gap-4 md:grid-cols-3">
                <ReportLink
                    href={route('reports.attendance')}
                    icon={ClipboardCheck}
                    title={t('Attendance report')}
                    description={t('A students × sessions matrix with attendance rates for a halaqa.')}
                />
                <ReportLink
                    href={route('reports.progress')}
                    icon={BookOpenCheck}
                    title={t('Memorization report')}
                    description={t('Ayahs memorized and revised, grades and attendance per student.')}
                />
                <ReportLink
                    href={route('progress.index')}
                    icon={UserRound}
                    title={t('Student report')}
                    description={t('Open any student from the recitations page and print their full report.')}
                />
            </div>

            <h2 className="mb-4 mt-10 text-lg font-bold text-ink">{t('Last 30 days')}</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                    icon={Percent}
                    label={t('Attendance rate')}
                    value={overview.attendance_rate === null ? '—' : `${overview.attendance_rate}%`}
                    tone="emerald"
                />
                <StatCard icon={BookOpenCheck} label={t('Ayahs memorized')} value={formatNumber(overview.memorized, locale)} tone="gold" />
                <StatCard icon={CalendarCheck} label={t('Completed sessions')} value={formatNumber(overview.sessions_completed, locale)} tone="sky" />
                <StatCard icon={CalendarX} label={t('Cancelled sessions')} value={formatNumber(overview.sessions_cancelled, locale)} tone="rose" />
            </div>

            <Card className="mt-6 overflow-hidden">
                <CardHeader title={t('Halaqat performance')} icon={ChartColumn} />
                {halaqat.length === 0 ? (
                    <EmptyState icon={ChartColumn} title={t('No halaqat yet')} compact />
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>{t('Halaqa')}</Th>
                                <Th>{t('Teacher')}</Th>
                                <Th>{t('Students')}</Th>
                                <Th>{t('Attendance rate')}</Th>
                                <Th>{t('Ayahs memorized')}</Th>
                                <Th>{t('Completed sessions')}</Th>
                                <Th>{t('Cancelled')}</Th>
                            </tr>
                        </thead>
                        <tbody>
                            {halaqat.map((row) => (
                                <Tr key={row.id}>
                                    <Td>
                                        <Link href={route('halaqat.show', row.id)} className="flex items-center gap-2 font-semibold text-ink hover:text-primary-700">
                                            <span className={cn('size-2.5 rounded-full', colorOf(row.color).dot)} />
                                            {row.name}
                                            {!row.is_active && <Badge>{t('Archived')}</Badge>}
                                        </Link>
                                    </Td>
                                    <Td className="text-muted">{row.teacher ?? '—'}</Td>
                                    <Td className="tabular-nums">{row.students_count}</Td>
                                    <Td className={cn('font-semibold tabular-nums', rateClass(row.attendance_rate))}>
                                        {row.attendance_rate === null ? '—' : `${row.attendance_rate}%`}
                                    </Td>
                                    <Td className="tabular-nums">{formatNumber(row.memorized, locale)}</Td>
                                    <Td className="tabular-nums">{row.sessions_completed}</Td>
                                    <Td className="tabular-nums">{row.sessions_cancelled}</Td>
                                </Tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Card>
        </AppLayout>
    );
}
