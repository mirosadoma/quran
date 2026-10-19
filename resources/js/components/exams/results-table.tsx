import { router } from '@inertiajs/react';
import { CircleCheck, Send, SendHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ExamEntryStatusBadge } from '@/components/exams/exam-badges';
import { GradeDialog } from '@/components/exams/grade-dialog';
import { ResultChip } from '@/components/exams/result-chip';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import type { ExamDayItem, ExamEntryItem } from '@/types';

interface ResultsTableProps {
    day: ExamDayItem;
    maxScore: number;
    /** The manager: records any result and sends the results to the students. */
    canManage: boolean;
    /** The examiner row of the viewer (a teacher grades their own students). */
    myExaminerId: number | null;
}

type Filter = 'all' | 'ungraded' | 'unsent';

/**
 * The results of a day, seen by the manager and the teachers only. The manager sends every
 * student their result one by one or all at once.
 */
export function ResultsTable({ day, maxScore, canManage, myExaminerId }: ResultsTableProps) {
    const { t } = useTrans();
    const dates = useDates();
    const [filter, setFilter] = useState<Filter>('all');
    const [grading, setGrading] = useState<ExamEntryItem | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const entries = day.entries ?? [];

    const filtered = useMemo(
        () =>
            entries.filter((entry) => {
                if (filter === 'ungraded') {
                    return !entry.is_graded;
                }

                if (filter === 'unsent') {
                    return entry.is_graded && entry.published_at === null;
                }

                return true;
            }),
        [entries, filter],
    );

    const counts = {
        all: entries.length,
        ungraded: entries.filter((entry) => !entry.is_graded).length,
        unsent: entries.filter((entry) => entry.is_graded && entry.published_at === null).length,
    };

    const publish = (entry: ExamEntryItem) => {
        router.post(route('exams.entries.publish', entry.id), {}, { preserveScroll: true, onStart: () => setBusy(`publish-${entry.id}`), onFinish: () => setBusy(null) });
    };

    const publishAll = () => {
        router.post(route('exams.days.publish-all', day.id), {}, { preserveScroll: true, onStart: () => setBusy('all'), onFinish: () => setBusy(null) });
    };

    const canGrade = (entry: ExamEntryItem) => canManage || (myExaminerId !== null && entry.examiner_id === myExaminerId);

    return (
        <div>
            <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3">
                <Tabs
                    value={filter}
                    onChange={setFilter}
                    items={[
                        { value: 'all', label: t('All'), count: counts.all },
                        { value: 'ungraded', label: t('Without result'), count: counts.ungraded },
                        { value: 'unsent', label: t('Not sent'), count: counts.unsent },
                    ]}
                />
                {canManage && (
                    <Button size="sm" variant="gold" className="ms-auto" loading={busy === 'all'} disabled={counts.unsent === 0} onClick={publishAll}>
                        <Send />
                        {t('Send all results')}
                    </Button>
                )}
            </div>

            {filtered.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted">{t('Nothing here.')}</p>
            ) : (
                <Table>
                    <thead>
                        <tr>
                            <Th>{t('Student')}</Th>
                            <Th>{t('Examiner')}</Th>
                            <Th>{t('Status')}</Th>
                            <Th>{t('Result')}</Th>
                            <Th>{t('Notes')}</Th>
                            <Th>{t('Sent')}</Th>
                            <Th className="text-end">{t('Actions')}</Th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((entry) => (
                            <Tr key={entry.id}>
                                <Td>
                                    <span className="flex items-center gap-2">
                                        {entry.student && <Avatar name={entry.student.name} src={entry.student.avatar_url} size="xs" />}
                                        <span className="min-w-0">
                                            <span className="block truncate font-semibold text-ink">{entry.student?.name}</span>
                                            {entry.halaqa && <span className="block truncate text-[11px] text-muted">{entry.halaqa.name}</span>}
                                        </span>
                                    </span>
                                </Td>
                                <Td className="text-muted">{entry.examiner?.name ?? '—'}</Td>
                                <Td>
                                    <ExamEntryStatusBadge status={entry.status} />
                                </Td>
                                <Td>
                                    <ResultChip entry={entry} maxScore={maxScore} />
                                    {entry.grader && <span className="mt-1 block text-[11px] text-muted">{t('By :name', { name: entry.grader.name })}</span>}
                                </Td>
                                <Td className="max-w-56 text-xs text-muted">
                                    <span className="line-clamp-2" dir="auto">
                                        {entry.notes ?? '—'}
                                    </span>
                                </Td>
                                <Td>
                                    {entry.published_at ? (
                                        <Badge tone="emerald">
                                            <CircleCheck className="size-3" />
                                            {dates.relative(entry.published_at)}
                                        </Badge>
                                    ) : (
                                        <span className="text-xs text-muted">—</span>
                                    )}
                                </Td>
                                <Td className="text-end">
                                    <span className="inline-flex items-center justify-end gap-1">
                                        {canGrade(entry) && (
                                            <Button size="xs" variant={entry.is_graded ? 'secondary' : 'primary'} onClick={() => setGrading(entry)}>
                                                {entry.is_graded ? t('Edit') : t('Record the result')}
                                            </Button>
                                        )}
                                        {canManage && entry.is_graded && (
                                            <Button
                                                size="xs"
                                                variant={entry.published_at ? 'ghost' : 'gold'}
                                                loading={busy === `publish-${entry.id}`}
                                                onClick={() => publish(entry)}
                                                title={entry.published_at ? t('Send again') : t('Send the result to the student')}
                                            >
                                                <SendHorizontal className="rtl:rotate-180" />
                                                {entry.published_at ? t('Send again') : t('Send')}
                                            </Button>
                                        )}
                                    </span>
                                </Td>
                            </Tr>
                        ))}
                    </tbody>
                </Table>
            )}

            <GradeDialog
                open={grading !== null}
                onClose={() => setGrading(null)}
                entry={grading}
                maxScore={maxScore}
                action={grading ? { url: route('exams.entries.grade', grading.id), method: 'put' } : null}
            />
        </div>
    );
}
