import { Link, router, useForm } from '@inertiajs/react';
import { ClipboardCheck, Clock, Inbox, Pencil, Trash } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ProgressTypeBadge } from '@/components/badges';
import {
    emptyPortion,
    IncompleteHint,
    incompletePortions,
    kindIncludes,
    kindOf,
    type PortionData,
    PortionFields,
    portionFromRange,
    progressTypes,
    type RecitationKind,
    RecitationKindPicker,
} from '@/components/progress/portion-fields';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Field, Textarea } from '@/components/ui/form';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { rangeLabel } from '@/lib/quran';
import type { RecitationSubmissionItem } from '@/types';

interface SubmissionFormProps {
    open: boolean;
    onClose: () => void;
    halaqaId: number;
    submission?: RecitationSubmissionItem | null;
    suggestion?: { surah: number; ayah: number } | null;
}

interface SubmissionFormData {
    kind: RecitationKind;
    memorization: PortionData;
    revision: PortionData;
    notes: string;
}

/**
 * The student enters the portions they are about to recite, so the teacher only adds the grade and mistakes.
 */
export function SubmissionForm({ open, onClose, halaqaId, submission, suggestion }: SubmissionFormProps) {
    const { t } = useTrans();

    const form = useForm<SubmissionFormData>({
        kind: 'memorization',
        memorization: emptyPortion(),
        revision: emptyPortion(),
        notes: '',
    });

    const errors = form.errors as Record<string, string | undefined>;

    useEffect(() => {
        if (!open) {
            return;
        }

        form.clearErrors();
        form.setData({
            kind: submission ? kindOf(submission.memorization, submission.revision) : 'memorization',
            memorization: submission?.memorization ? portionFromRange(submission.memorization) : emptyPortion(suggestion),
            revision: submission?.revision ? portionFromRange(submission.revision) : emptyPortion(),
            notes: submission?.notes ?? '',
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, submission?.id]);

    const incomplete = incompletePortions(form.data.kind, form.data);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (incomplete.length > 0) {
            return;
        }

        form.transform((data) => ({
            memorization: kindIncludes(data.kind, 'memorization') ? data.memorization : null,
            revision: kindIncludes(data.kind, 'revision') ? data.revision : null,
            notes: data.notes,
        }));
        form.put(route('halaqat.recitation.update', halaqaId), {
            preserveScroll: true,
            onSuccess: (page) => {
                // Close only when the server really kept the recitation.
                const saved = (page.props as { submissions?: RecitationSubmissionItem[] }).submissions ?? [];

                if (saved.some((item) => item.halaqa_id === halaqaId)) {
                    onClose();
                } else {
                    toast.error(t('The recitation was not sent. Check the portions and try again.'));
                }
            },
            onError: () => toast.error(t('The recitation was not sent. Check the portions and try again.')),
        });
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="lg"
            title={submission ? t('Edit my recitation') : t('Enter my recitation')}
            description={t('Enter what you will recite. Your teacher will add the grade and mistakes.')}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" form="submission-form" loading={form.processing} disabled={incomplete.length > 0}>
                        {t('Send to the teacher')}
                    </Button>
                </>
            }
        >
            <form id="submission-form" onSubmit={submit} className="space-y-5">
                <div className="space-y-2">
                    <RecitationKindPicker value={form.data.kind} onChange={(kind) => form.setData('kind', kind)} />
                    {errors.portions && <p className="text-xs font-medium text-rose-600">{errors.portions}</p>}
                </div>

                {progressTypes
                    .filter((type) => kindIncludes(form.data.kind, type))
                    .map((type) => (
                        <PortionFields key={type} type={type} value={form.data[type]} onChange={(value) => form.setData(type, value)} errors={errors} />
                    ))}

                <IncompleteHint types={incomplete} />

                <Field label={t('Note for the teacher')} error={form.errors.notes}>
                    <Textarea value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} rows={2} />
                </Field>
            </form>
        </Modal>
    );
}

/**
 * Dashboard card of the recitations waiting for grading; each opens its grading form.
 */
export function PendingSubmissionsCard({ submissions }: { submissions: RecitationSubmissionItem[] }) {
    const { t, locale } = useTrans();
    const dates = useDates();

    if (submissions.length === 0) {
        return null;
    }

    return (
        <Card className="border-sky-200 dark:border-sky-500/20">
            <CardHeader title={t('Recitations waiting for grading')} description={t('Students entered what they will recite. Add the grade and mistakes.')} icon={Inbox} />
            <ul className="divide-y divide-line">
                {submissions.map((submission) => (
                    <li key={submission.id}>
                        <Link
                            href={route('halaqat.show', { halaqa: submission.halaqa_id, tab: 'students', submission: submission.id })}
                            className="flex items-center gap-3 px-5 py-3 transition hover:bg-surface-muted/60"
                        >
                            {submission.student && <Avatar name={submission.student.name} src={submission.student.avatar_url} size="sm" />}
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold text-ink">
                                    {submission.student?.name}
                                    {submission.halaqa && <span className="ms-2 text-xs font-normal text-muted">{submission.halaqa.name}</span>}
                                </span>
                                <span className="block truncate text-xs text-muted">
                                    {progressTypes
                                        .map((type) => {
                                            const range = submission[type];

                                            return range ? rangeLabel(range, locale) : null;
                                        })
                                        .filter(Boolean)
                                        .join(' · ')}
                                </span>
                            </span>
                            <span className="flex shrink-0 flex-col items-end gap-1">
                                <span className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-2 py-1 text-xs font-semibold text-white">
                                    <ClipboardCheck className="size-3.5" />
                                    {t('Grade')}
                                </span>
                                {submission.submitted_at && <span className="text-[11px] text-muted">{dates.relative(submission.submitted_at)}</span>}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </Card>
    );
}

interface PendingSubmissionsProps {
    submissions: RecitationSubmissionItem[];
    showStudent?: boolean;
    /** Teacher side: open the recitation form pre-filled with the submission. */
    onReview?: (submission: RecitationSubmissionItem) => void;
    /** Student side: change the submission. */
    onEdit?: (submission: RecitationSubmissionItem) => void;
}

/**
 * Recitations entered by students and waiting for the teacher's grading.
 */
export function PendingSubmissions({ submissions, showStudent = false, onReview, onEdit }: PendingSubmissionsProps) {
    const { t, locale } = useTrans();
    const dates = useDates();
    const [removing, setRemoving] = useState<RecitationSubmissionItem | null>(null);
    const [processing, setProcessing] = useState(false);

    const destroy = () => {
        if (!removing) {
            return;
        }

        setProcessing(true);
        router.delete(route('recitation-submissions.destroy', removing.id), {
            preserveScroll: true,
            onFinish: () => {
                setProcessing(false);
                setRemoving(null);
            },
        });
    };

    return (
        <>
            <ul className="divide-y divide-line">
                {submissions.map((submission) => (
                    <li key={submission.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                        <div className="flex min-w-0 flex-1 gap-3">
                            {showStudent && submission.student && <Avatar name={submission.student.name} src={submission.student.avatar_url} />}
                            <div className="min-w-0 flex-1">
                                {showStudent && submission.student && <p className="font-semibold text-ink">{submission.student.name}</p>}
                                <div className="mt-1 space-y-1">
                                    {progressTypes.map((type) => {
                                        const range = submission[type];

                                        return (
                                            range && (
                                                <div key={type} className="flex flex-wrap items-center gap-2">
                                                    <ProgressTypeBadge type={type} />
                                                    <span className="font-quran text-base text-ink">{rangeLabel(range, locale)}</span>
                                                </div>
                                            )
                                        );
                                    })}
                                </div>
                                {submission.notes && (
                                    <p dir="auto" className="mt-1.5 text-sm text-ink/80">
                                        {submission.notes}
                                    </p>
                                )}
                                {submission.submitted_at && (
                                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                                        <Clock className="size-3.5" />
                                        {dates.relative(submission.submitted_at)}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                            {onReview && (
                                <Button size="sm" onClick={() => onReview(submission)}>
                                    <ClipboardCheck />
                                    {t('Grade')}
                                </Button>
                            )}
                            {onEdit && (
                                <Button variant="secondary" size="sm" onClick={() => onEdit(submission)}>
                                    <Pencil />
                                    {t('Edit')}
                                </Button>
                            )}
                            <Button variant="ghost" size="icon-sm" className="hover:text-rose-600" onClick={() => setRemoving(submission)} aria-label={t('Remove')}>
                                <Trash />
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>

            <ConfirmDialog
                open={removing !== null}
                onClose={() => setRemoving(null)}
                onConfirm={destroy}
                processing={processing}
                title={t('Remove this recitation?')}
                message={onReview ? t('The student can enter it again.') : t('You can enter it again at any time.')}
                confirmLabel={t('Remove')}
            />
        </>
    );
}
