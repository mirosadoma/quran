import { router, usePage } from '@inertiajs/react';
import { Award, BookOpen, BookOpenCheck, CalendarCheck, Layers, ListChecks, Percent, Plus, Printer } from 'lucide-react';
import { useState } from 'react';
import { StarOrnament } from '@/components/brand';
import { MemorizationTrendChart } from '@/components/charts';
import { RecordForm } from '@/components/progress/record-form';
import { RecordList } from '@/components/progress/record-list';
import { JuzMap } from '@/components/progress/juz-map';
import { Avatar } from '@/components/ui/avatar';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Pagination } from '@/components/ui/pagination';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatCard } from '@/components/ui/stat-card';
import { Tabs } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { nextPosition, surahName, TOTAL_AYAHS } from '@/lib/quran';
import { cleanQuery, cn, colorOf, formatNumber } from '@/lib/utils';
import type { HalaqaRef, Paginated, ProgressRecordItem, ProgressSummary, ProgressType, RecitationSubmissionItem, UserItem, WeeklyMemorization } from '@/types';

interface StudentProgressProps {
    student: Omit<UserItem, 'halaqat'> & { halaqat: HalaqaRef[] };
    summary: ProgressSummary;
    records: Paginated<ProgressRecordItem>;
    weekly: WeeklyMemorization[];
    filters: { type: ProgressType | null };
    canRecord: boolean;
    halaqat: HalaqaRef[];
    submissions: RecitationSubmissionItem[];
    lastPosition: { surah: number; ayah: number } | null;
}

export default function StudentProgress({ student, summary, records, weekly, filters, canRecord, halaqat, submissions, lastPosition }: StudentProgressProps) {
    const { t, locale } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const { auth } = usePage().props;
    const [recording, setRecording] = useState(false);
    const [editing, setEditing] = useState<ProgressRecordItem | null>(null);
    const coverage = summary.coverage;
    const isSelf = auth.user?.id === student.id;
    const suggestion = lastPosition ? nextPosition(lastPosition) : null;

    return (
        <AppLayout
            title={isSelf ? t('My progress') : t('Progress of :name', { name: student.name })}
            hideHeader
        >
            <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Avatar name={student.name} src={student.avatar_url} size="lg" />
                    <div>
                        <h1 className="text-2xl font-bold text-ink">{isSelf ? t('My progress') : student.name}</h1>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {student.halaqat.map((halaqa) => (
                                <span key={halaqa.id} className={cn('rounded-md px-2 py-0.5 text-xs font-medium', colorOf(halaqa.color).soft)}>
                                    {halaqa.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {canRecord && (
                        <Button onClick={() => setRecording(true)}>
                            <Plus />
                            {t('Record a recitation')}
                        </Button>
                    )}
                    <LinkButton href={route('reports.student', student.id)} variant="secondary">
                        <Printer />
                        {t('Printable report')}
                    </LinkButton>
                </div>
            </div>

            <Card className="relative mb-6 overflow-hidden">
                <CardBody className="flex flex-col gap-5 lg:flex-row lg:items-center">
                    <div className="flex-1">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <p className="text-sm text-muted">{t('Total memorized')}</p>
                                <p className="mt-1 text-3xl font-bold text-ink tabular-nums">
                                    {formatNumber(coverage.ayahs, locale)}
                                    <span className="ms-2 text-base font-medium text-muted">/ {formatNumber(TOTAL_AYAHS, locale)}</span>
                                </p>
                            </div>
                            <p className="font-quran text-4xl font-bold text-gold-500">{coverage.percent}%</p>
                        </div>
                        <ProgressBar value={coverage.ayahs} max={TOTAL_AYAHS} className="mt-4 h-3" />
                    </div>
                    {suggestion && (
                        <div className="rounded-2xl bg-gold-50 px-5 py-4 text-sm dark:bg-gold-500/10 lg:w-72">
                            <p className="text-xs font-semibold text-gold-700 dark:text-gold-300">{t('Next portion starts at')}</p>
                            <p className="mt-1 font-quran text-xl text-ink">
                                {surahName(suggestion.surah, locale)} {suggestion.ayah}
                            </p>
                        </div>
                    )}
                </CardBody>
            </Card>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <StatCard icon={Layers} label={t('Completed ajza')} value={`${coverage.completed_juz} / 30`} tone="emerald" />
                <StatCard icon={ListChecks} label={t('Completed surahs')} value={`${coverage.completed_surahs} / 114`} tone="gold" />
                <StatCard icon={BookOpen} label={t('Memorized this month')} value={t(':count ayahs', { count: summary.memorized_this_month })} tone="sky" />
                <StatCard
                    icon={Percent}
                    label={t('Attendance rate')}
                    value={summary.attendance.rate === null ? '—' : `${summary.attendance.rate}%`}
                    hint={t(':present present · :absent absent', { present: summary.attendance.present + summary.attendance.late, absent: summary.attendance.absent })}
                    tone="teal"
                />
                <StatCard
                    icon={Award}
                    label={t('Average grade')}
                    value={summary.average_grade ? labels.grade[summary.average_grade] : '—'}
                    hint={summary.last_record_on ? t('Last recitation: :date', { date: dates.day(summary.last_record_on) }) : undefined}
                    tone="violet"
                />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title={t('Memorization map (30 ajza)')} icon={Layers} />
                    <CardBody>
                        <JuzMap juz={coverage.juz} />
                    </CardBody>
                </Card>
                <Card>
                    <CardHeader title={t('Surahs')} icon={BookOpenCheck} description={t(':count surahs started', { count: coverage.surahs.length })} />
                    {coverage.surahs.length === 0 ? (
                        <p className="px-6 py-8 text-center text-sm text-muted">{t('No memorization recorded yet.')}</p>
                    ) : (
                        <ul className="max-h-96 divide-y divide-line overflow-y-auto">
                            {[...coverage.surahs].reverse().map((item) => {
                                const complete = item.covered === item.total;

                                return (
                                    <li key={item.number} className="px-5 py-2.5">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center gap-2 font-medium text-ink">
                                                <span className="w-6 text-xs text-muted tabular-nums">{item.number}</span>
                                                <span className="font-quran text-base">{surahName(item.number, locale)}</span>
                                                {complete && <StarOrnament className="size-3 text-gold-500" />}
                                            </span>
                                            <span className="text-xs text-muted tabular-nums">
                                                {item.covered}/{item.total}
                                            </span>
                                        </div>
                                        {!complete && <ProgressBar value={item.covered} max={item.total} size="sm" className="mt-1.5" />}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>
            </div>

            <Card className="mt-6">
                <CardHeader title={t('Weekly memorization and revision')} description={t('Last 12 weeks')} icon={CalendarCheck} />
                <MemorizationTrendChart data={weekly} className="p-5 sm:p-6" />
            </Card>

            <div className="mt-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-ink">{t('Recitation history')}</h2>
                    <Tabs
                        value={filters.type ?? 'all'}
                        onChange={(type) =>
                            router.get(
                                route('progress.student', student.id),
                                cleanQuery({ type: type === 'all' ? null : type }),
                                { preserveScroll: true, preserveState: true, replace: true },
                            )
                        }
                        items={[
                            { value: 'all', label: t('All') },
                            { value: 'memorization', label: labels.progressType.memorization },
                            { value: 'revision', label: labels.progressType.revision },
                        ]}
                    />
                </div>
                <Card className="overflow-hidden">
                    <RecordList records={records.data} onEdit={setEditing} />
                </Card>
                <Pagination data={records} className="mt-6" />
            </div>

            {canRecord && (
                <RecordForm
                    open={recording || editing !== null}
                    onClose={() => {
                        setRecording(false);
                        setEditing(null);
                    }}
                    record={editing}
                    student={{ id: student.id, name: student.name }}
                    halaqat={halaqat}
                    suggestion={suggestion}
                    submissions={submissions}
                />
            )}
        </AppLayout>
    );
}
