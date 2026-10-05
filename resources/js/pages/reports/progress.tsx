import { Link } from '@inertiajs/react';
import { Award, BookOpen, BookOpenCheck, FileText, Repeat, Users } from 'lucide-react';
import { GradeBadge } from '@/components/badges';
import { MemorizationTrendChart } from '@/components/charts';
import { ReportFilters } from '@/components/reports/report-filters';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { cn, formatNumber } from '@/lib/utils';
import type { Grade, HalaqaRef, UserRef, WeeklyMemorization } from '@/types';

interface ProgressRow {
    student: UserRef;
    memorized: number;
    revised: number;
    records_count: number;
    mistakes: number;
    average_grade: Grade | null;
    last_record_on: string | null;
    total_memorized: number;
    attendance_rate: number | null;
}

interface ProgressReportProps {
    halaqat: HalaqaRef[];
    filters: { halaqa_id: number | null; from: string; to: string };
    report: {
        rows: ProgressRow[];
        weekly: WeeklyMemorization[];
        summary: { students: number; memorized: number; revised: number; records_count: number; average_grade: Grade | null };
    };
}

export default function ProgressReport({ halaqat, filters, report }: ProgressReportProps) {
    const { t, locale } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const halaqa = halaqat.find((item) => item.id === filters.halaqa_id);

    return (
        <AppLayout
            title={t('Memorization report')}
            description={`${halaqa?.name ?? t('All halaqat')} · ${dates.day(filters.from)} – ${dates.day(filters.to)}`}
            back={{ href: route('reports.index'), label: t('Reports') }}
        >
            <ReportFilters routeName="reports.progress" filters={filters} halaqat={halaqat} allowAllHalaqat />

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard icon={BookOpen} label={t('Ayahs memorized')} value={formatNumber(report.summary.memorized, locale)} tone="gold" />
                <StatCard icon={Repeat} label={t('Ayahs revised')} value={formatNumber(report.summary.revised, locale)} tone="sky" />
                <StatCard icon={BookOpenCheck} label={t('Recitations')} value={formatNumber(report.summary.records_count, locale)} tone="emerald" />
                <StatCard
                    icon={Award}
                    label={t('Average grade')}
                    value={report.summary.average_grade ? labels.grade[report.summary.average_grade] : '—'}
                    hint={t(':count students', { count: report.summary.students })}
                    tone="violet"
                />
            </div>

            <Card className="mt-6">
                <CardHeader title={t('Weekly memorization and revision')} icon={BookOpenCheck} />
                <MemorizationTrendChart data={report.weekly} className="p-5 sm:p-6" />
            </Card>

            <Card className="mt-6 overflow-hidden">
                <CardHeader title={t('Students')} icon={Users} />
                {report.rows.length === 0 ? (
                    <EmptyState icon={Users} title={t('No students found')} compact />
                ) : (
                    <Table>
                        <thead>
                            <tr>
                                <Th>{t('Student')}</Th>
                                <Th>{t('Memorized')}</Th>
                                <Th>{t('Revised')}</Th>
                                <Th>{t('Recitations')}</Th>
                                <Th>{t('Mistakes')}</Th>
                                <Th>{t('Average grade')}</Th>
                                <Th>{t('Attendance')}</Th>
                                <Th>{t('Total memorized')}</Th>
                                <Th>{t('Last recitation')}</Th>
                                <Th className="no-print" />
                            </tr>
                        </thead>
                        <tbody>
                            {report.rows.map((row) => (
                                <Tr key={row.student.id}>
                                    <Td>
                                        <Link href={route('progress.student', row.student.id)} className="flex items-center gap-2.5 whitespace-nowrap">
                                            <Avatar name={row.student.name} src={row.student.avatar_url} size="xs" />
                                            <span className="font-semibold text-ink hover:text-primary-700">{row.student.name}</span>
                                        </Link>
                                    </Td>
                                    <Td className="font-semibold tabular-nums text-ink">{formatNumber(row.memorized, locale)}</Td>
                                    <Td className="tabular-nums">{formatNumber(row.revised, locale)}</Td>
                                    <Td className="tabular-nums">{row.records_count}</Td>
                                    <Td className="tabular-nums">{row.mistakes}</Td>
                                    <Td>{row.average_grade ? <GradeBadge grade={row.average_grade} /> : <span className="text-muted">—</span>}</Td>
                                    <Td
                                        className={cn(
                                            'font-semibold tabular-nums',
                                            row.attendance_rate === null
                                                ? 'text-muted'
                                                : row.attendance_rate >= 80
                                                  ? 'text-emerald-600'
                                                  : row.attendance_rate >= 60
                                                    ? 'text-amber-600'
                                                    : 'text-rose-600',
                                        )}
                                    >
                                        {row.attendance_rate === null ? '—' : `${row.attendance_rate}%`}
                                    </Td>
                                    <Td className="tabular-nums">{formatNumber(row.total_memorized, locale)}</Td>
                                    <Td className="whitespace-nowrap text-muted">{row.last_record_on ? dates.day(row.last_record_on) : '—'}</Td>
                                    <Td className="no-print">
                                        <Link
                                            href={route('reports.student', { student: row.student.id, from: filters.from, to: filters.to })}
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline dark:text-primary-300"
                                        >
                                            <FileText className="size-3.5" />
                                            {t('Report')}
                                        </Link>
                                    </Td>
                                </Tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Card>
        </AppLayout>
    );
}
