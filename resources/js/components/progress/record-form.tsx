import { useForm } from '@inertiajs/react';
import { Inbox } from 'lucide-react';
import { type FormEvent, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import type { HalaqaRef, ProgressRecordItem, RecitationSubmissionItem } from '@/types';

interface StudentOption {
    id: number;
    name: string;
    halaqa_ids?: number[];
}

interface RecordFormProps {
    open: boolean;
    onClose: () => void;
    record?: ProgressRecordItem | null;
    student?: { id: number; name: string } | null;
    students?: StudentOption[];
    halaqat?: HalaqaRef[];
    sessionId?: number | null;
    defaultHalaqaId?: number | null;
    suggestion?: { surah: number; ayah: number } | null;
    /** Recitations entered by students and waiting for grading: they pre-fill the form. */
    submissions?: RecitationSubmissionItem[];
}

interface RecordFormData {
    student_id: number | null;
    halaqa_id: number | null;
    halaqa_session_id: number | null;
    submission_id: number | null;
    kind: RecitationKind;
    memorization: PortionData;
    revision: PortionData;
    notes: string;
    recorded_on: string;
}

export function RecordForm({ open, onClose, record, student, students = [], halaqat = [], sessionId, defaultHalaqaId, suggestion, submissions = [] }: RecordFormProps) {
    const { t } = useTrans();
    const dates = useDates();

    const form = useForm<RecordFormData>({
        student_id: null,
        halaqa_id: null,
        halaqa_session_id: null,
        submission_id: null,
        kind: 'memorization',
        memorization: emptyPortion(null, true),
        revision: emptyPortion(null, true),
        notes: '',
        recorded_on: '',
    });

    const errors = form.errors as Record<string, string | undefined>;

    /**
     * Form values taken from the recitation the student entered.
     */
    const fromSubmission = (submission: RecitationSubmissionItem): Partial<RecordFormData> => ({
        submission_id: submission.id,
        halaqa_id: submission.halaqa_id,
        kind: kindOf(submission.memorization, submission.revision),
        memorization: submission.memorization ? portionFromRange(submission.memorization, true) : emptyPortion(suggestion, true),
        revision: submission.revision ? portionFromRange(submission.revision, true) : emptyPortion(null, true),
    });

    const submissionOf = (studentId: number | null) => submissions.find((item) => item.student?.id === studentId);

    useEffect(() => {
        if (!open) {
            return;
        }

        form.clearErrors();

        if (record) {
            const portionOf = (type: string) => record.portions.find((portion) => portion.type === type);
            const memorization = portionOf('memorization');
            const revision = portionOf('revision');

            form.setData({
                student_id: record.student?.id ?? null,
                halaqa_id: record.halaqa_id,
                halaqa_session_id: record.halaqa_session_id,
                submission_id: null,
                kind: kindOf(memorization, revision),
                memorization: memorization ? { ...portionFromRange(memorization), grade: memorization.grade, mistakes: memorization.mistakes } : emptyPortion(null, true),
                revision: revision ? { ...portionFromRange(revision), grade: revision.grade, mistakes: revision.mistakes } : emptyPortion(null, true),
                notes: record.notes ?? '',
                recorded_on: record.recorded_on,
            });

            return;
        }

        const submission = submissionOf(student?.id ?? null);

        form.setData({
            student_id: student?.id ?? null,
            halaqa_id: defaultHalaqaId ?? halaqat[0]?.id ?? null,
            halaqa_session_id: sessionId ?? null,
            submission_id: null,
            kind: 'memorization',
            memorization: emptyPortion(suggestion, true),
            revision: emptyPortion(null, true),
            notes: '',
            recorded_on: dates.today(),
            ...(submission ? fromSubmission(submission) : {}),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, record?.id, student?.id, sessionId]);

    const selectedStudent = students.find((item) => item.id === form.data.student_id);
    const halaqaOptions = selectedStudent?.halaqa_ids ? halaqat.filter((halaqa) => selectedStudent.halaqa_ids?.includes(halaqa.id)) : halaqat;
    const submission = form.data.submission_id ? submissions.find((item) => item.id === form.data.submission_id) : undefined;

    const chooseStudent = (id: number | null) => {
        const option = students.find((item) => item.id === id);
        const pending = submissionOf(id);

        form.setData((data) => ({
            ...data,
            student_id: id,
            halaqa_id: option?.halaqa_ids?.[0] ?? data.halaqa_id,
            submission_id: null,
            ...(pending ? fromSubmission(pending) : {}),
        }));
    };

    const incomplete = incompletePortions(form.data.kind, form.data);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (incomplete.length > 0) {
            return;
        }

        const options = { preserveScroll: true, onSuccess: () => onClose() };
        const portions = (data: RecordFormData) => ({
            memorization: kindIncludes(data.kind, 'memorization') ? data.memorization : null,
            revision: kindIncludes(data.kind, 'revision') ? data.revision : null,
            kind: undefined,
        });

        if (record) {
            form.transform((data) => ({
                ...data,
                ...portions(data),
                student_id: undefined,
                halaqa_id: undefined,
                halaqa_session_id: undefined,
                submission_id: undefined,
            }));
            form.put(route('progress.update', record.id), options);
        } else {
            form.transform((data) => ({ ...data, ...portions(data) }));
            form.post(route('progress.store'), options);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="lg"
            title={record ? t('Edit recitation') : t('Record a recitation')}
            description={student?.name ?? record?.student?.name}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" form="record-form" loading={form.processing} disabled={incomplete.length > 0}>
                        {record ? t('Save changes') : t('Save the recitation')}
                    </Button>
                </>
            }
        >
            <form id="record-form" onSubmit={submit} className="space-y-5">
                {!student && !record && (
                    <Field label={t('Student')} error={form.errors.student_id} required>
                        <Select value={form.data.student_id ?? ''} onChange={(event) => chooseStudent(Number(event.target.value) || null)}>
                            <option value="">{t('Choose a student')}</option>
                            {students.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                    {submissionOf(item.id) ? ` • ${t('Entered a recitation')}` : ''}
                                </option>
                            ))}
                        </Select>
                    </Field>
                )}

                {submission && (
                    <div className="flex gap-3 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:bg-sky-500/10 dark:text-sky-100">
                        <Inbox className="mt-0.5 size-4 shrink-0" />
                        <div className="space-y-1">
                            <p className="font-semibold">{t('The student entered this recitation. Add the grade and mistakes, and change anything if needed.')}</p>
                            {submission.notes && (
                                <p dir="auto" className="text-sky-800/90 dark:text-sky-200/90">
                                    {t('Student note')}: {submission.notes}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    <RecitationKindPicker value={form.data.kind} onChange={(kind) => form.setData('kind', kind)} />
                    {errors.portions && <p className="text-xs font-medium text-rose-600">{errors.portions}</p>}
                </div>

                {progressTypes
                    .filter((type) => kindIncludes(form.data.kind, type))
                    .map((type) => (
                        <PortionFields
                            key={type}
                            type={type}
                            value={form.data[type]}
                            onChange={(value) => form.setData(type, value)}
                            errors={errors}
                            graded
                            highlightGrading={!!submission}
                        />
                    ))}

                <IncompleteHint types={incomplete} />

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('Date')} error={form.errors.recorded_on}>
                        <Input type="date" value={form.data.recorded_on} onChange={(event) => form.setData('recorded_on', event.target.value)} />
                    </Field>

                    {!record && halaqaOptions.length > 1 && (
                        <Field label={t('Halaqa')} error={form.errors.halaqa_id}>
                            <Select value={form.data.halaqa_id ?? ''} onChange={(event) => form.setData('halaqa_id', Number(event.target.value) || null)}>
                                {halaqaOptions.map((halaqa) => (
                                    <option key={halaqa.id} value={halaqa.id}>
                                        {halaqa.name}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                    )}
                </div>

                <Field label={t('Teacher notes')} error={form.errors.notes} hint={t('The student sees these notes and receives them in the notification.')}>
                    <Textarea
                        value={form.data.notes}
                        onChange={(event) => form.setData('notes', event.target.value)}
                        placeholder={t('For example: pay attention to the rules of madd')}
                    />
                </Field>
            </form>
        </Modal>
    );
}
