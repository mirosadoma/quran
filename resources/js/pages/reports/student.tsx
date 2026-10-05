import { usePage } from '@inertiajs/react';
import { GradeBadge, ProgressTypeBadge } from '@/components/badges';
import { LogoMark, StarOrnament } from '@/components/brand';
import { JuzMap } from '@/components/progress/juz-map';
import { ReportFilters } from '@/components/reports/report-filters';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { rangeLabel, TOTAL_AYAHS } from '@/lib/quran';
import { formatNumber } from '@/lib/utils';
import type { AttendanceStats, Grade, ProgressRecordItem, ProgressSummary, UserItem } from '@/types';

interface StudentReportProps {
    student: Omit<UserItem, 'halaqat'> & { guardian_name: string | null; halaqat: { id: number; name: string; teacher: string | null }[] };
    summary: ProgressSummary;
    attendance: AttendanceStats;
    records: ProgressRecordItem[];
    period: { memorized: number; revised: number; records: number; mistakes: number; average_grade: Grade | null };
    filters: { from: string; to: string };
}

function Figure({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-2xl border border-line px-4 py-3 text-center">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-xl font-bold text-ink tabular-nums">{value}</p>
        </div>
    );
}

export default function StudentReport({ student, summary, attendance, records, period, filters }: StudentReportProps) {
    const { t, locale } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const { app } = usePage().props;

    return (
        <AppLayout title={t('Report: :name', { name: student.name })} hideHeader>
            <ReportFilters routeName="reports.student" routeParams={{ student: student.id }} filters={filters} exportable={false} />

            <div className="mx-auto max-w-4xl space-y-6 print:max-w-none">
                <Card className="relative overflow-hidden">
                    <div className="h-1.5 bg-linear-to-l from-primary-700 via-gold-500 to-primary-700" />
                    <CardBody className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            {app.logo_url ? <img src={app.logo_url} alt="" className="size-14 rounded-2xl object-cover" /> : <LogoMark className="size-14" />}
                            <div>
                                <p className="font-quran text-2xl font-bold text-ink">{app.name}</p>
                                <p className="text-sm text-muted">{t('Student progress report')}</p>
                            </div>
                        </div>
                        <div className="text-sm sm:text-end">
                            <p className="text-muted">{t('Period')}</p>
                            <p className="font-semibold text-ink">
                                {dates.day(filters.from)} – {dates.day(filters.to)}
                            </p>
                            <p className="mt-1 text-xs text-muted">{dates.hijri()}</p>
                        </div>
                    </CardBody>
                    <div className="grid gap-4 border-t border-line px-6 py-5 text-sm sm:grid-cols-3">
                        <div>
                            <p className="text-muted">{t('Student')}</p>
                            <p className="mt-0.5 text-lg font-bold text-ink">{student.name}</p>
                        </div>
                        <div>
                            <p className="text-muted">{t('Halaqat')}</p>
                            <p className="mt-0.5 font-semibold text-ink">
                                {student.halaqat.map((halaqa) => (halaqa.teacher ? `${halaqa.name} (${halaqa.teacher})` : halaqa.name)).join('، ') || '—'}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted">{t('Guardian')}</p>
                            <p className="mt-0.5 font-semibold text-ink">{student.guardian_name ?? '—'}</p>
                        </div>
                    </div>
                </Card>

                <Card>
                    <CardHeader title={t('Overall memorization')} />
                    <CardBody>
                        <div className="mb-3 flex items-end justify-between">
                            <p className="text-2xl font-bold text-ink tabular-nums">
                                {formatNumber(summary.coverage.ayahs, locale)}
                                <span className="ms-1 text-sm font-medium text-muted">/ {formatNumber(TOTAL_AYAHS, locale)}</span>
                            </p>
                            <p className="font-quran text-3xl font-bold text-gold-500">{summary.coverage.percent}%</p>
                        </div>
                        <ProgressBar value={summary.coverage.ayahs} max={TOTAL_AYAHS} className="mb-6" />
                        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <Figure label={t('Completed ajza')} value={summary.coverage.completed_juz} />
                            <Figure label={t('Completed surahs')} value={summary.coverage.completed_surahs} />
                            <Figure label={t('Average grade')} value={summary.average_grade ? labels.grade[summary.average_grade] : '—'} />
                            <Figure label={t('Overall attendance')} value={summary.attendance.rate === null ? '—' : `${summary.attendance.rate}%`} />
                        </div>
                        <JuzMap juz={summary.coverage.juz} />
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title={t('During the period')} />
                    <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Figure label={t('Ayahs memorized')} value={formatNumber(period.memorized, locale)} />
                        <Figure label={t('Ayahs revised')} value={formatNumber(period.revised, locale)} />
                        <Figure label={t('Recitations')} value={period.records} />
                        <Figure label={t('Mistakes')} value={period.mistakes} />
                        <Figure label={t('Average grade')} value={period.average_grade ? labels.grade[period.average_grade] : '—'} />
                        <Figure label={t('Attendance rate')} value={attendance.rate === null ? '—' : `${attendance.rate}%`} />
                        <Figure label={t('Present')} value={attendance.present + attendance.late} />
                        <Figure label={t('Absent')} value={attendance.absent} />
                    </CardBody>
                </Card>

                <Card className="overflow-hidden">
                    <CardHeader title={t('Recitations during the period')} />
                    {records.length === 0 ? (
                        <p className="px-6 py-8 text-center text-sm text-muted">{t('No recitations recorded during this period.')}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-surface-muted text-xs text-muted">
                                    <tr>
                                        <th className="px-4 py-2.5 text-start font-semibold">{t('Date')}</th>
                                        <th className="px-4 py-2.5 text-start font-semibold">{t('Type')}</th>
                                        <th className="px-4 py-2.5 text-start font-semibold">{t('Portion')}</th>
                                        <th className="px-4 py-2.5 text-start font-semibold">{t('Ayahs')}</th>
                                        <th className="px-4 py-2.5 text-start font-semibold">{t('Grade')}</th>
                                        <th className="px-4 py-2.5 text-start font-semibold">{t('Notes')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                    {records.map((record) => (
                                        <tr key={record.id} className="break-inside-avoid">
                                            <td className="whitespace-nowrap px-4 py-2.5 text-muted">{dates.day(record.recorded_on)}</td>
                                            <td className="px-4 py-2.5">
                                                <ProgressTypeBadge type={record.type} />
                                            </td>
                                            <td className="px-4 py-2.5 font-quran text-base text-ink">{rangeLabel(record, locale)}</td>
                                            <td className="px-4 py-2.5 tabular-nums">{record.ayahs_count}</td>
                                            <td className="px-4 py-2.5">{record.grade ? <GradeBadge grade={record.grade} /> : '—'}</td>
                                            <td className="px-4 py-2.5 text-xs text-muted">{record.notes ?? ''}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>

                <div className="flex items-center justify-between px-2 pb-6 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                        <StarOrnament className="size-3 text-gold-500" />
                        {t('Generated on :date', { date: dates.date(new Date()) })}
                    </span>
                    <span>{t("Teacher's signature: ____________")}</span>
                </div>
            </div>
        </AppLayout>
    );
}
