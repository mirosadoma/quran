import { Link } from '@inertiajs/react';
import { CalendarCheck, Check, Clock, Percent, ShieldCheck, Users, X } from 'lucide-react';
import { ReportFilters } from '@/components/reports/report-filters';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { AttendanceStatus, HalaqaRef, UserRef } from '@/types';

interface AttendanceReport {
    sessions: { id: number; title: string | null; starts_at: string; status: string }[];
    rows: {
        student: UserRef;
        statuses: (AttendanceStatus | null)[];
        present: number;
        late: number;
        absent: number;
        excused: number;
        rate: number | null;
    }[];
    summary: { sessions: number; students: number; present: number; late: number; absent: number; excused: number; rate: number | null };
}

interface AttendanceReportProps {
    halaqat: HalaqaRef[];
    filters: { halaqa_id: number | null; from: string; to: string };
    report: AttendanceReport | null;
}

const cellStyles: Record<AttendanceStatus, string> = {
    present: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    late: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    absent: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    excused: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
};

const cellIcons: Record<AttendanceStatus, typeof Check> = {
    present: Check,
    late: Clock,
    absent: X,
    excused: ShieldCheck,
};

export default function AttendanceReportPage({ halaqat, filters, report }: AttendanceReportProps) {
    const { t } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const halaqa = halaqat.find((item) => item.id === filters.halaqa_id);

    return (
        <AppLayout
            title={t('Attendance report')}
            description={halaqa ? `${halaqa.name} · ${dates.day(filters.from)} – ${dates.day(filters.to)}` : undefined}
            back={{ href: route('reports.index'), label: t('Reports') }}
        >
            <ReportFilters routeName="reports.attendance" filters={filters} halaqat={halaqat} />

            {!report ? (
                <Card>
                    <EmptyState icon={CalendarCheck} title={t('No halaqat to report on yet')} />
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <StatCard icon={Percent} label={t('Attendance rate')} value={report.summary.rate === null ? '—' : `${report.summary.rate}%`} tone="emerald" />
                        <StatCard icon={CalendarCheck} label={t('Sessions')} value={report.summary.sessions} tone="sky" />
                        <StatCard icon={Users} label={t('Students')} value={report.summary.students} tone="gold" />
                        <StatCard
                            icon={X}
                            label={t('Absences')}
                            value={report.summary.absent}
                            hint={t(':count late · :excused excused', { count: report.summary.late, excused: report.summary.excused })}
                            tone="rose"
                        />
                    </div>

                    <Card className="mt-6 overflow-hidden">
                        <CardHeader
                            title={t('Attendance sheet')}
                            icon={CalendarCheck}
                            actions={
                                <div className="flex flex-wrap gap-3 text-xs text-muted">
                                    {(Object.keys(cellStyles) as AttendanceStatus[]).map((status) => {
                                        const Icon = cellIcons[status];

                                        return (
                                            <span key={status} className="inline-flex items-center gap-1.5">
                                                <span className={cn('flex size-5 items-center justify-center rounded-md', cellStyles[status])}>
                                                    <Icon className="size-3" />
                                                </span>
                                                {labels.attendance[status]}
                                            </span>
                                        );
                                    })}
                                </div>
                            }
                        />
                        {report.sessions.length === 0 ? (
                            <EmptyState icon={CalendarCheck} title={t('No sessions in this period')} compact />
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full border-separate border-spacing-0 text-sm">
                                    <thead>
                                        <tr>
                                            <th className="sticky start-0 z-10 border-b border-line bg-surface-muted px-4 py-3 text-start text-xs font-semibold text-muted">
                                                {t('Student')}
                                            </th>
                                            {report.sessions.map((session) => (
                                                <th key={session.id} className="border-b border-line bg-surface-muted px-1 py-2 text-center text-[11px] font-semibold text-muted">
                                                    <Link href={route('sessions.show', session.id)} className="hover:text-ink">
                                                        <span className="block">{dates.date(session.starts_at, { weekday: 'short', day: undefined, month: undefined, year: undefined })}</span>
                                                        <span className="block whitespace-nowrap text-ink">{dates.date(session.starts_at, { year: undefined })}</span>
                                                    </Link>
                                                </th>
                                            ))}
                                            <th className="border-b border-line bg-surface-muted px-3 py-3 text-center text-xs font-semibold text-muted">{t('Present')}</th>
                                            <th className="border-b border-line bg-surface-muted px-3 py-3 text-center text-xs font-semibold text-muted">{t('Absent')}</th>
                                            <th className="border-b border-line bg-surface-muted px-3 py-3 text-center text-xs font-semibold text-muted">{t('Rate')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.rows.map((row) => (
                                            <tr key={row.student.id} className="hover:bg-surface-muted/50">
                                                <td className="sticky start-0 z-10 border-b border-line/70 bg-surface px-4 py-2.5">
                                                    <Link href={route('progress.student', row.student.id)} className="flex items-center gap-2.5 whitespace-nowrap">
                                                        <Avatar name={row.student.name} src={row.student.avatar_url} size="xs" />
                                                        <span className="font-medium text-ink hover:text-primary-700">{row.student.name}</span>
                                                    </Link>
                                                </td>
                                                {row.statuses.map((status, index) => {
                                                    const Icon = status ? cellIcons[status] : null;

                                                    return (
                                                        <td key={index} className="border-b border-line/70 px-1 py-2 text-center">
                                                            {status && Icon ? (
                                                                <span
                                                                    title={labels.attendance[status]}
                                                                    className={cn('mx-auto flex size-7 items-center justify-center rounded-lg', cellStyles[status])}
                                                                >
                                                                    <Icon className="size-3.5" />
                                                                </span>
                                                            ) : (
                                                                <span className="text-line-strong">·</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="border-b border-line/70 px-3 text-center tabular-nums text-ink">{row.present + row.late}</td>
                                                <td className="border-b border-line/70 px-3 text-center tabular-nums text-ink">{row.absent}</td>
                                                <td
                                                    className={cn(
                                                        'border-b border-line/70 px-3 text-center font-bold tabular-nums',
                                                        row.rate === null ? 'text-muted' : row.rate >= 80 ? 'text-emerald-600' : row.rate >= 60 ? 'text-amber-600' : 'text-rose-600',
                                                    )}
                                                >
                                                    {row.rate === null ? '—' : `${row.rate}%`}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Card>
                </>
            )}
        </AppLayout>
    );
}
