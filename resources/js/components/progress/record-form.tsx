import { useForm } from '@inertiajs/react';
import { BookOpen, Minus, Plus, Repeat, Sparkles } from 'lucide-react';
import { type FormEvent, useEffect } from 'react';
import { SurahSelect } from '@/components/progress/surah-select';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { gradeTone, grades, useLabels } from '@/lib/labels';
import { ayahCount, countAyahs, rangeLabel } from '@/lib/quran';
import { cn } from '@/lib/utils';
import type { Grade, HalaqaRef, ProgressRecordItem, ProgressType } from '@/types';

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
}

interface RecordFormData {
    student_id: number | null;
    halaqa_id: number | null;
    halaqa_session_id: number | null;
    type: ProgressType;
    from_surah: number | null;
    from_ayah: number | null;
    to_surah: number | null;
    to_ayah: number | null;
    grade: Grade | null;
    mistakes: number;
    notes: string;
    recorded_on: string;
}

const gradeChip: Record<string, string> = {
    emerald: 'peer-checked:bg-emerald-600 peer-checked:text-white peer-checked:ring-emerald-600',
    teal: 'peer-checked:bg-teal-600 peer-checked:text-white peer-checked:ring-teal-600',
    sky: 'peer-checked:bg-sky-600 peer-checked:text-white peer-checked:ring-sky-600',
    amber: 'peer-checked:bg-amber-500 peer-checked:text-white peer-checked:ring-amber-500',
    rose: 'peer-checked:bg-rose-600 peer-checked:text-white peer-checked:ring-rose-600',
};

export function RecordForm({ open, onClose, record, student, students = [], halaqat = [], sessionId, defaultHalaqaId, suggestion }: RecordFormProps) {
    const { t, locale } = useTrans();
    const labels = useLabels();
    const dates = useDates();

    const form = useForm<RecordFormData>({
        student_id: null,
        halaqa_id: null,
        halaqa_session_id: null,
        type: 'memorization',
        from_surah: null,
        from_ayah: null,
        to_surah: null,
        to_ayah: null,
        grade: 'very_good',
        mistakes: 0,
        notes: '',
        recorded_on: '',
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.clearErrors();

        if (record) {
            form.setData({
                student_id: record.student?.id ?? null,
                halaqa_id: record.halaqa_id,
                halaqa_session_id: record.halaqa_session_id,
                type: record.type,
                from_surah: record.from_surah,
                from_ayah: record.from_ayah,
                to_surah: record.to_surah,
                to_ayah: record.to_ayah,
                grade: record.grade,
                mistakes: record.mistakes,
                notes: record.notes ?? '',
                recorded_on: record.recorded_on,
            });

            return;
        }

        form.setData({
            student_id: student?.id ?? null,
            halaqa_id: defaultHalaqaId ?? halaqat[0]?.id ?? null,
            halaqa_session_id: sessionId ?? null,
            type: 'memorization',
            from_surah: suggestion?.surah ?? null,
            from_ayah: suggestion?.ayah ?? null,
            to_surah: suggestion?.surah ?? null,
            to_ayah: suggestion ? Math.min(ayahCount(suggestion.surah), suggestion.ayah + 4) : null,
            grade: 'very_good',
            mistakes: 0,
            notes: '',
            recorded_on: dates.today(),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, record?.id, student?.id, sessionId]);

    const count = countAyahs(form.data.from_surah, form.data.from_ayah, form.data.to_surah, form.data.to_ayah);
    const selectedStudent = students.find((item) => item.id === form.data.student_id);
    const halaqaOptions = selectedStudent?.halaqa_ids ? halaqat.filter((halaqa) => selectedStudent.halaqa_ids?.includes(halaqa.id)) : halaqat;

    const setFromSurah = (surah: number) => {
        form.setData((data) => ({
            ...data,
            from_surah: surah,
            from_ayah: data.from_ayah && data.from_ayah <= ayahCount(surah) ? data.from_ayah : 1,
            to_surah: !data.to_surah || data.to_surah < surah ? surah : data.to_surah,
            to_ayah: !data.to_surah || data.to_surah < surah ? ayahCount(surah) : data.to_ayah,
        }));
    };

    const wholeSurah = () => {
        if (!form.data.from_surah) {
            return;
        }

        form.setData((data) => ({ ...data, from_ayah: 1, to_surah: data.from_surah, to_ayah: ayahCount(data.from_surah as number) }));
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => onClose() };

        if (record) {
            form.transform((data) => ({ ...data, student_id: undefined, halaqa_id: undefined, halaqa_session_id: undefined }));
            form.put(route('progress.update', record.id), options);
        } else {
            form.transform((data) => data);
            form.post(route('progress.store'), options);
        }
    };

    const numberValue = (value: string) => (value === '' ? null : Math.max(1, Number.parseInt(value, 10) || 1));

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
                    <Button type="submit" form="record-form" loading={form.processing}>
                        {record ? t('Save changes') : t('Save the recitation')}
                    </Button>
                </>
            }
        >
            <form id="record-form" onSubmit={submit} className="space-y-5">
                {!student && !record && (
                    <Field label={t('Student')} error={form.errors.student_id} required>
                        <Select
                            value={form.data.student_id ?? ''}
                            onChange={(event) => {
                                const id = Number(event.target.value) || null;
                                const option = students.find((item) => item.id === id);
                                form.setData((data) => ({
                                    ...data,
                                    student_id: id,
                                    halaqa_id: option?.halaqa_ids?.[0] ?? data.halaqa_id,
                                }));
                            }}
                        >
                            <option value="">{t('Choose a student')}</option>
                            {students.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </Select>
                    </Field>
                )}

                <div className="grid grid-cols-2 gap-2">
                    {(['memorization', 'revision'] as const).map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => form.setData('type', type)}
                            className={cn(
                                'flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                                form.data.type === type
                                    ? 'border-primary-600 bg-primary-50 text-primary-800 dark:bg-primary-500/10 dark:text-primary-200'
                                    : 'border-line text-muted hover:border-line-strong',
                            )}
                        >
                            {type === 'memorization' ? <BookOpen className="size-4" /> : <Repeat className="size-4" />}
                            {labels.progressType[type]}
                        </button>
                    ))}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-ink">{t('From')}</p>
                        <SurahSelect value={form.data.from_surah} onChange={setFromSurah} invalid={!!form.errors.from_surah} />
                        <Input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            placeholder={t('Ayah')}
                            value={form.data.from_ayah ?? ''}
                            onChange={(event) => form.setData('from_ayah', numberValue(event.target.value))}
                            aria-invalid={!!form.errors.from_ayah}
                        />
                        {(form.errors.from_surah || form.errors.from_ayah) && (
                            <p className="text-xs font-medium text-rose-600">{form.errors.from_surah ?? form.errors.from_ayah}</p>
                        )}
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-ink">{t('To')}</p>
                        <SurahSelect value={form.data.to_surah} onChange={(surah) => form.setData('to_surah', surah)} invalid={!!form.errors.to_surah} />
                        <Input
                            type="number"
                            min={1}
                            inputMode="numeric"
                            placeholder={t('Ayah')}
                            value={form.data.to_ayah ?? ''}
                            onChange={(event) => form.setData('to_ayah', numberValue(event.target.value))}
                            aria-invalid={!!form.errors.to_ayah}
                        />
                        {(form.errors.to_surah || form.errors.to_ayah) && (
                            <p className="text-xs font-medium text-rose-600">{form.errors.to_surah ?? form.errors.to_ayah}</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-surface-muted px-4 py-3">
                    <div className="text-sm">
                        {count ? (
                            <>
                                <span className="font-quran text-base text-ink">
                                    {rangeLabel(
                                        {
                                            from_surah: form.data.from_surah as number,
                                            from_ayah: form.data.from_ayah as number,
                                            to_surah: form.data.to_surah as number,
                                            to_ayah: form.data.to_ayah as number,
                                        },
                                        locale,
                                    )}
                                </span>
                                <span className="ms-2 font-semibold text-primary-700 dark:text-primary-300">{t(':count ayahs', { count })}</span>
                            </>
                        ) : (
                            <span className="text-muted">{t('Choose the start and end of the portion.')}</span>
                        )}
                    </div>
                    <Button variant="ghost" size="xs" onClick={wholeSurah} disabled={!form.data.from_surah}>
                        <Sparkles />
                        {t('Whole surah')}
                    </Button>
                </div>

                <Field label={t('Grade')} error={form.errors.grade}>
                    <div className="flex flex-wrap gap-2">
                        {grades.map((grade) => (
                            <label key={grade} className="cursor-pointer">
                                <input
                                    type="radio"
                                    name="grade"
                                    className="peer sr-only"
                                    checked={form.data.grade === grade}
                                    onChange={() => form.setData('grade', grade)}
                                />
                                <span
                                    className={cn(
                                        'inline-flex rounded-xl px-3.5 py-2 text-sm font-semibold text-ink ring-1 ring-line transition hover:ring-line-strong',
                                        gradeChip[gradeTone[grade]],
                                    )}
                                >
                                    {labels.grade[grade]}
                                </span>
                            </label>
                        ))}
                    </div>
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t('Mistakes')} error={form.errors.mistakes}>
                        <div className="flex items-center gap-2">
                            <Button variant="secondary" size="icon" onClick={() => form.setData('mistakes', Math.max(0, form.data.mistakes - 1))}>
                                <Minus />
                            </Button>
                            <Input
                                type="number"
                                min={0}
                                className="text-center"
                                value={form.data.mistakes}
                                onChange={(event) => form.setData('mistakes', Math.max(0, Number.parseInt(event.target.value, 10) || 0))}
                            />
                            <Button variant="secondary" size="icon" onClick={() => form.setData('mistakes', form.data.mistakes + 1)}>
                                <Plus />
                            </Button>
                        </div>
                    </Field>
                    <Field label={t('Date')} error={form.errors.recorded_on}>
                        <Input type="date" value={form.data.recorded_on} onChange={(event) => form.setData('recorded_on', event.target.value)} />
                    </Field>
                </div>

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
