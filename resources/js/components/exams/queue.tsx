import { router } from '@inertiajs/react';
import { BellRing, CircleCheck, DoorOpen, RotateCcw, UserX } from 'lucide-react';
import { useState } from 'react';
import { ExamEntryStatusBadge } from '@/components/exams/exam-badges';
import { GradeDialog } from '@/components/exams/grade-dialog';
import { ResultChip } from '@/components/exams/result-chip';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ExamEntryItem } from '@/types';

export type QueueAction = 'alert' | 'call' | 'finish' | 'grade' | 'absent' | 'reset';

interface QueueProps {
    entries: ExamEntryItem[];
    maxScore: number;
    /** The address of an action on an entry (signed-in examiners and outside examiners differ). */
    actionUrl: (action: QueueAction, entry: ExamEntryItem) => string;
    /** Whether the viewer may act on the students (the examiner of the queue, or the manager). */
    canAct: boolean;
    /** The student of the viewer, highlighted in the list. */
    highlightId?: number | null;
    compact?: boolean;
}

/**
 * The queue of an examiner: who is waiting, who is being examined, who is done, with the
 * buttons to tell a student to get ready, call them in, finish with them or mark them absent.
 */
export function Queue({ entries, maxScore, actionUrl, canAct, highlightId = null, compact = false }: QueueProps) {
    const { t } = useTrans();
    const [busy, setBusy] = useState<string | null>(null);
    const [grading, setGrading] = useState<{ entry: ExamEntryItem; action: QueueAction } | null>(null);

    const act = (action: QueueAction, entry: ExamEntryItem) => {
        const key = `${action}-${entry.id}`;

        router.post(actionUrl(action, entry), {}, { preserveScroll: true, onStart: () => setBusy(key), onFinish: () => setBusy(null) });
    };

    const called = entries.find((entry) => entry.status === 'called');

    if (entries.length === 0) {
        return <p className="px-5 py-8 text-center text-sm text-muted">{t('No students in this queue.')}</p>;
    }

    return (
        <>
            <ul className="divide-y divide-line">
                {entries.map((entry) => {
                    const mine = entry.student_id === highlightId;
                    const pending = entry.status === 'waiting' || entry.status === 'alerted';

                    return (
                        <li
                            key={entry.id}
                            className={cn(
                                'flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition',
                                entry.status === 'called' && 'bg-rose-50/70 dark:bg-rose-500/10',
                                mine && 'ring-2 ring-inset ring-gold-400/70',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                                    entry.status === 'examined' ? 'bg-emerald-600 text-white' : 'bg-surface-muted text-muted ring-1 ring-line',
                                )}
                            >
                                {entry.status === 'examined' ? <CircleCheck className="size-4" /> : entry.position}
                            </span>
                            {entry.student && <Avatar name={entry.student.name} src={entry.student.avatar_url} size="sm" />}
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-ink">
                                    {entry.student?.name}
                                    {mine && <span className="ms-2 text-xs font-normal text-gold-600">({t('you')})</span>}
                                </p>
                                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                                    {entry.halaqa && <span>{entry.halaqa.name}</span>}
                                    <ExamEntryStatusBadge status={entry.status} />
                                    {entry.status === 'examined' && !compact && <ResultChip entry={entry} maxScore={maxScore} />}
                                </p>
                            </div>

                            {canAct && (
                                <div className="flex shrink-0 flex-wrap items-center gap-1">
                                    {pending && (
                                        <>
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                loading={busy === `alert-${entry.id}`}
                                                disabled={entry.status === 'alerted'}
                                                onClick={() => act('alert', entry)}
                                                title={t('Tell the student to get ready')}
                                            >
                                                <BellRing />
                                                {!compact && t('Alert')}
                                            </Button>
                                            <Button
                                                size="sm"
                                                loading={busy === `call-${entry.id}`}
                                                disabled={called !== undefined}
                                                onClick={() => act('call', entry)}
                                                title={called ? t('Finish with the current student first.') : t('Call the student into the private room')}
                                            >
                                                <DoorOpen />
                                                {!compact && t('Call in')}
                                            </Button>
                                            <Button size="icon-sm" variant="ghost" className="hover:text-rose-600" loading={busy === `absent-${entry.id}`} onClick={() => act('absent', entry)} aria-label={t('Absent')} title={t('Absent')}>
                                                <UserX />
                                            </Button>
                                        </>
                                    )}
                                    {entry.status === 'called' && (
                                        <>
                                            <Button size="sm" variant="success" onClick={() => setGrading({ entry, action: 'finish' })}>
                                                <CircleCheck />
                                                {t('Finish and grade')}
                                            </Button>
                                            <Button size="icon-sm" variant="ghost" loading={busy === `reset-${entry.id}`} onClick={() => act('reset', entry)} aria-label={t('Back to the queue')} title={t('Back to the queue')}>
                                                <RotateCcw />
                                            </Button>
                                        </>
                                    )}
                                    {entry.status === 'examined' && (
                                        <Button size="sm" variant={entry.is_graded ? 'secondary' : 'gold'} onClick={() => setGrading({ entry, action: 'grade' })}>
                                            {entry.is_graded ? t('Edit the result') : t('Record the result')}
                                        </Button>
                                    )}
                                    {entry.status === 'absent' && (
                                        <Button size="sm" variant="secondary" loading={busy === `reset-${entry.id}`} onClick={() => act('reset', entry)}>
                                            <RotateCcw />
                                            {t('Back to the queue')}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>

            <GradeDialog
                open={grading !== null}
                onClose={() => setGrading(null)}
                entry={grading?.entry ?? null}
                maxScore={maxScore}
                finishing={grading?.action === 'finish'}
                action={grading ? { url: actionUrl(grading.action, grading.entry), method: grading.action === 'finish' ? 'post' : 'put' } : null}
            />
        </>
    );
}
