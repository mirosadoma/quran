import { router, usePage, usePoll } from '@inertiajs/react';
import { Award, CalendarDays, ClipboardList, Clock, DoorOpen, Lock, Pencil, Play, Trash, UserRound, Users } from 'lucide-react';
import { useState } from 'react';
import { Distribution } from '@/components/exams/distribution';
import { ExamDayStatusBadge, ExamEntryStatusBadge, ExamStateBadge } from '@/components/exams/exam-badges';
import { ExaminersPanel } from '@/components/exams/examiners-panel';
import { ResultChip } from '@/components/exams/result-chip';
import { ResultsTable } from '@/components/exams/results-table';
import { Countdown } from '@/components/session/countdown';
import { Badge } from '@/components/ui/badge';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { useRealtime } from '@/hooks/use-realtime';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { cn, colorOf } from '@/lib/utils';
import type { ExamDayItem, ExamItem } from '@/types';

interface ExamShowProps {
    exam: ExamItem;
    missingStudents: Record<string, { id: number; name: string }[]>;
    teachers: { id: number; name: string; role: string }[];
    embedded: boolean;
    can: { update: boolean; delete: boolean; view_results: boolean };
}

type DayTab = 'examiners' | 'students' | 'results';

export default function ExamShow({ exam, missingStudents, teachers, can }: ExamShowProps) {
    const { t } = useTrans();
    const dates = useDates();
    const { realtime, auth } = usePage().props;
    const [deleting, setDeleting] = useState(false);
    const days = exam.days ?? [];
    const live = days.some((day) => day.status === 'live');

    useRealtime('exam', () => router.reload());
    usePoll(15_000, {}, { autoStart: live && !realtime.enabled });

    return (
        <AppLayout
            title={exam.title}
            heading={
                <span className="flex flex-wrap items-center gap-3">
                    {exam.title}
                    {exam.state && <ExamStateBadge state={exam.state} />}
                </span>
            }
            description={
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {exam.academy && auth.user?.role === 'admin' && <span>{exam.academy.name}</span>}
                    <span className="inline-flex items-center gap-1">
                        <Award className="size-4" />
                        {t('Score out of :max', { max: exam.max_score })}
                    </span>
                    {exam.creator && (
                        <span className="inline-flex items-center gap-1">
                            <UserRound className="size-4" />
                            {exam.creator.name}
                        </span>
                    )}
                </span>
            }
            back={{ href: route('exams.index'), label: t('Exams') }}
            actions={
                can.update && (
                    <>
                        <LinkButton href={route('exams.edit', exam.id)} variant="secondary">
                            <Pencil />
                            {t('Edit')}
                        </LinkButton>
                        {can.delete && (
                            <Button variant="danger-soft" onClick={() => setDeleting(true)}>
                                <Trash />
                                {t('Delete')}
                            </Button>
                        )}
                    </>
                )
            }
        >
            {exam.description && (
                <Card className="mb-6 p-5">
                    <p className="text-sm leading-relaxed whitespace-pre-line text-ink" dir="auto">
                        {exam.description}
                    </p>
                </Card>
            )}

            {days.length === 0 ? (
                <Card className="p-8 text-center text-sm text-muted">{t('No days scheduled yet')}</Card>
            ) : (
                <div className="space-y-6">
                    {days.map((day, index) => (
                        <DayPanel key={day.id} day={day} index={index} exam={exam} missingStudents={missingStudents[String(day.id)] ?? []} teachers={teachers} can={can} />
                    ))}
                </div>
            )}

            <ConfirmDialog
                open={deleting}
                onClose={() => setDeleting(false)}
                onConfirm={() => router.delete(route('exams.destroy', exam.id))}
                title={t('Delete this exam?')}
                message={t('Its days, examiners and results are deleted with it. This cannot be undone.')}
                confirmLabel={t('Delete')}
            />
        </AppLayout>
    );
}

interface DayPanelProps {
    day: ExamDayItem;
    index: number;
    exam: ExamItem;
    missingStudents: { id: number; name: string }[];
    teachers: { id: number; name: string; role: string }[];
    can: ExamShowProps['can'];
}

function DayPanel({ day, index, exam, missingStudents, teachers, can }: DayPanelProps) {
    const { t } = useTrans();
    const dates = useDates();
    const { auth } = usePage().props;
    const [tab, setTab] = useState<DayTab>(can.update ? 'students' : can.view_results ? 'results' : 'examiners');
    const [closing, setClosing] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const isStudent = auth.user?.role === 'student';
    const summary = day.summary;
    const upcoming = day.status === 'scheduled' && new Date(day.starts_at).getTime() > Date.now();

    const post = (name: string, url: string, data: Record<string, boolean | number | string> = {}) => {
        router.post(url, data, { preserveScroll: true, onStart: () => setBusy(name), onFinish: () => setBusy(null) });
    };

    const tabs: { value: DayTab; label: string; count?: number }[] = [];

    if (can.update) {
        tabs.push({ value: 'students', label: t('Students and distribution'), count: summary?.students });
    }

    tabs.push({ value: 'examiners', label: t('Examiners'), count: day.examiners?.length });

    if (can.view_results) {
        tabs.push({ value: 'results', label: t('Results'), count: summary?.graded });
    }

    return (
        <Card className={cn(day.status === 'live' && 'border-emerald-300 shadow-lg shadow-emerald-500/10 dark:border-emerald-500/40')}>
            <CardHeader
                icon={CalendarDays}
                title={
                    <span className="flex flex-wrap items-center gap-2">
                        {t('Day :number', { number: index + 1 })}: {dates.dateTime(day.starts_at)}
                        <ExamDayStatusBadge status={day.status} />
                        {day.status === 'live' && <Badge tone="gold">{day.phase === 'opening' ? t('Opening word') : t('Examining')}</Badge>}
                    </span>
                }
                description={
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="inline-flex items-center gap-1">
                            <Clock className="size-3.5" />
                            {day.ends_at ? t('Until :time', { time: dates.time(day.ends_at) }) : t('Open until it is closed by hand')}
                        </span>
                        {day.halaqat?.map((halaqa) => (
                            <span key={halaqa.id} className="inline-flex items-center gap-1.5">
                                <span className={cn('size-2 rounded-full', colorOf(halaqa.color).dot)} />
                                {halaqa.name}
                            </span>
                        ))}
                    </span>
                }
                actions={
                    <>
                        {upcoming && <Countdown target={day.starts_at} />}
                        {day.can_enter && (
                            <LinkButton href={route('exams.room', day.id)} variant={day.status === 'live' ? 'success' : 'primary'}>
                                <DoorOpen />
                                {day.status === 'live' ? t('Enter the exam room') : t('Enter early')}
                            </LinkButton>
                        )}
                        {can.update && day.status === 'scheduled' && (
                            <Button variant="gold" loading={busy === 'open'} onClick={() => post('open', route('exams.days.open', day.id), { enter: true })}>
                                <Play />
                                {t('Open the day now')}
                            </Button>
                        )}
                        {can.update && day.status === 'live' && day.phase === 'opening' && (
                            <Button loading={busy === 'examining'} onClick={() => post('examining', route('exams.days.start-examining', day.id))}>
                                <Users />
                                {t('Start the examining')}
                            </Button>
                        )}
                        {can.update && day.status === 'live' && (
                            <Button variant="danger-soft" onClick={() => setClosing(true)}>
                                <Lock />
                                {t('Close the day')}
                            </Button>
                        )}
                    </>
                }
            />

            {isStudent ? (
                <StudentView day={day} maxScore={exam.max_score} />
            ) : (
                <>
                    {summary && (
                        <div className="grid grid-cols-2 gap-px border-b border-line bg-line sm:grid-cols-5">
                            {[
                                { label: t('Students'), value: summary.students },
                                { label: t('Waiting'), value: summary.pending },
                                { label: t('Examined'), value: summary.examined },
                                { label: t('With a result'), value: summary.graded },
                                { label: t('Results sent'), value: summary.published },
                            ].map((item) => (
                                <div key={item.label} className="bg-surface px-4 py-3 text-center">
                                    <p className="text-lg font-bold text-ink tabular-nums">{item.value}</p>
                                    <p className="text-[11px] text-muted">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="border-b border-line px-5 py-3">
                        <Tabs items={tabs} value={tab} onChange={setTab} />
                    </div>

                    {tab === 'students' && can.update && <Distribution day={day} missingStudents={missingStudents} />}
                    {tab === 'examiners' && <ExaminersPanel day={day} teachers={teachers} canManage={can.update} />}
                    {tab === 'results' && can.view_results && <ResultsTable day={day} maxScore={exam.max_score} canManage={can.update} myExaminerId={day.my_examiner_id ?? null} />}
                </>
            )}

            <ConfirmDialog
                open={closing}
                onClose={() => setClosing(false)}
                onConfirm={() => {
                    setClosing(false);
                    post('close', route('exams.days.close', day.id));
                }}
                title={t('Close this exam day?')}
                message={t('The rooms close for everyone. Students who were not examined are marked absent; you can still record their results.')}
                confirmLabel={t('Close the day')}
            />
        </Card>
    );
}

/**
 * What a student sees of a day: their examiner, their place in the queue, and their result
 * once it is sent.
 */
function StudentView({ day, maxScore }: { day: ExamDayItem; maxScore: number }) {
    const { t } = useTrans();
    const entry = day.my_entry;

    if (!entry) {
        return <p className="px-5 py-6 text-sm text-muted">{t('You are not examined on this day.')}</p>;
    }

    return (
        <div className="grid gap-4 p-5 sm:grid-cols-3">
            <div className="rounded-2xl border border-line p-4">
                <p className="text-xs text-muted">{t('Your examiner')}</p>
                <p className="mt-1 font-bold text-ink">{entry.examiner?.name ?? t('Not assigned yet')}</p>
            </div>
            <div className="rounded-2xl border border-line p-4">
                <p className="text-xs text-muted">{t('Your place in the queue')}</p>
                <p className="mt-1 flex items-center gap-2 font-bold text-ink">
                    {entry.position > 0 ? t('Number :position', { position: entry.position }) : '—'}
                    <ExamEntryStatusBadge status={entry.status} />
                </p>
            </div>
            <div className="rounded-2xl border border-line p-4">
                <p className="text-xs text-muted">{t('Your result')}</p>
                <div className="mt-1 font-bold text-ink">
                    {entry.published_at ? <ResultChip entry={entry} maxScore={maxScore} /> : <span className="text-sm text-muted">{t('Your result will appear here once your academy sends it.')}</span>}
                </div>
                {entry.published_at && entry.notes && (
                    <p className="mt-2 text-sm leading-relaxed text-ink/80" dir="auto">
                        {entry.notes}
                    </p>
                )}
            </div>
            <p className="flex items-center gap-2 text-xs text-muted sm:col-span-3">
                <ClipboardList className="size-4" />
                {t('On the day, enter the exam room from here or from your dashboard. You will be told when your turn is next, and when to enter the private room.')}
            </p>
        </div>
    );
}
