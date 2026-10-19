import { useForm } from '@inertiajs/react';
import { type FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { useTrans } from '@/lib/i18n';
import { grades, gradeTone, useLabels } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { ExamEntryItem, Grade } from '@/types';

interface GradeDialogProps {
    open: boolean;
    onClose: () => void;
    entry: ExamEntryItem | null;
    maxScore: number;
    /** Where the result is sent: finishing with the student (POST) or recording the result (PUT). */
    action: { url: string; method: 'post' | 'put' } | null;
    /** Finishing with the student: the result may be left for later. */
    finishing?: boolean;
}

const tones: Record<string, string> = {
    emerald: 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200',
    teal: 'border-teal-600 bg-teal-50 text-teal-800 dark:bg-teal-500/10 dark:text-teal-200',
    sky: 'border-sky-600 bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200',
    amber: 'border-amber-600 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200',
    rose: 'border-rose-600 bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200',
};

/**
 * The result of a student: a grade, a score out of the exam's maximum (the percentage is
 * shown as it is typed) and notes. The grade may be cancelled (left empty).
 */
export function GradeDialog({ open, onClose, entry, maxScore, action, finishing = false }: GradeDialogProps) {
    const { t } = useTrans();
    const labels = useLabels();

    const form = useForm<{ grade: Grade | ''; score: string; notes: string }>({ grade: '', score: '', notes: '' });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.clearErrors();
        form.setData({
            grade: entry?.grade ?? '',
            score: entry?.score !== null && entry?.score !== undefined ? String(entry.score) : '',
            notes: entry?.notes ?? '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, entry?.id]);

    const score = form.data.score === '' ? null : Number(form.data.score);
    const percent = score !== null && maxScore > 0 && !Number.isNaN(score) ? Math.round((score / maxScore) * 1000) / 10 : null;
    const hasResult = form.data.grade !== '' || form.data.score !== '';

    const send = (clear = false) => {
        if (!action) {
            return;
        }

        form.transform((data) => (clear ? { grade: null, score: null, notes: null } : { grade: data.grade || null, score: data.score === '' ? null : Number(data.score), notes: data.notes || null }));

        const options = { preserveScroll: true, onSuccess: () => onClose() };

        if (action.method === 'post') {
            form.post(action.url, options);
        } else {
            form.put(action.url, options);
        }
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        send();
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="md"
            title={finishing ? t('Finish and grade') : t('Record the result')}
            description={entry?.student?.name}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    {finishing ? (
                        <Button variant="outline" loading={form.processing} onClick={() => send(true)}>
                            {t('Finish without a result')}
                        </Button>
                    ) : (
                        entry?.is_graded && (
                            <Button variant="danger-soft" loading={form.processing} onClick={() => send(true)}>
                                {t('Remove the result')}
                            </Button>
                        )
                    )}
                    <Button type="submit" form="grade-form" loading={form.processing} disabled={!hasResult}>
                        {t('Save the result')}
                    </Button>
                </>
            }
        >
            <form id="grade-form" onSubmit={submit} className="space-y-5">
                <Field label={t('Grade')} error={form.errors.grade}>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {grades.map((grade) => (
                            <button
                                key={grade}
                                type="button"
                                onClick={() => form.setData('grade', form.data.grade === grade ? '' : grade)}
                                className={cn(
                                    'rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                                    form.data.grade === grade ? tones[gradeTone[grade]] : 'border-line text-muted hover:border-line-strong',
                                )}
                            >
                                {labels.grade[grade]}
                            </button>
                        ))}
                    </div>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('Score out of :max', { max: maxScore })} error={form.errors.score}>
                        <Input
                            type="number"
                            min={0}
                            max={maxScore}
                            dir="ltr"
                            value={form.data.score}
                            onChange={(event) => form.setData('score', event.target.value)}
                            aria-invalid={!!form.errors.score}
                        />
                    </Field>
                    <div className="flex flex-col justify-end">
                        <p className="mb-1.5 text-sm font-medium text-ink">{t('Percentage')}</p>
                        <p dir="ltr" className="flex h-11 items-center rounded-xl bg-surface-muted px-3.5 text-lg font-bold text-ink tabular-nums">
                            {percent !== null ? `${percent}%` : '—'}
                        </p>
                    </div>
                </div>

                <Field label={t('Notes')} error={form.errors.notes} hint={t('The student sees the notes with their result once it is sent.')}>
                    <Textarea value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} rows={2} />
                </Field>
            </form>
        </Modal>
    );
}
