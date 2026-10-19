import { useForm } from '@inertiajs/react';
import { CalendarPlus, Info, Lock, Save, Trash } from 'lucide-react';
import { type FormEvent, useMemo } from 'react';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ExamDayStatus, ExamItem } from '@/types';

interface DayInput {
    id: number | null;
    date: string;
    start_time: string;
    end_time: string;
    halaqa_ids: number[];
    status?: ExamDayStatus;
}

interface ExamFormProps {
    exam: (ExamItem & { days: DayInput[] }) | null;
    halaqat: { id: number; academy_id: number | null; name: string; color: string; teacher: string | null; students_count: number }[];
    /** The academies the administration chooses from for a new exam. */
    academies: { id: number; name: string; timezone: string }[];
    academyId: number | null;
    timezone: string;
    defaults: { max_score: number; start_time: string };
}

function emptyDay(startTime: string, date = ''): DayInput {
    return { id: null, date, start_time: startTime, end_time: '', halaqa_ids: [] };
}

/**
 * Planning an exam: its title and maximum score, then its days, each with its time and its
 * halaqat. Examiners and the distribution of students are set on the exam page afterwards.
 */
export default function ExamForm({ exam, halaqat, academies, academyId, timezone, defaults }: ExamFormProps) {
    const { t } = useTrans();
    const dates = useDates();
    const editing = exam !== null;
    const choosesAcademy = academies.length > 0;

    const form = useForm({
        academy_id: academyId ?? ('' as number | ''),
        title: exam?.title ?? '',
        description: exam?.description ?? '',
        max_score: exam?.max_score ?? defaults.max_score,
        days: exam?.days?.length ? exam.days : [emptyDay(defaults.start_time)],
    });

    const errors = form.errors as Record<string, string | undefined>;
    const effectiveTimezone = choosesAcademy ? (academies.find((academy) => academy.id === form.data.academy_id)?.timezone ?? timezone) : timezone;

    const halaqaOptions = useMemo(
        () =>
            halaqat
                .filter((halaqa) => !choosesAcademy || halaqa.academy_id === form.data.academy_id)
                .map((halaqa) => ({
                    id: halaqa.id,
                    name: halaqa.name,
                    meta: [halaqa.teacher, t(':count students', { count: halaqa.students_count })].filter(Boolean).join(' · '),
                })),
        [halaqat, choosesAcademy, form.data.academy_id, t],
    );

    const updateDay = (index: number, changes: Partial<DayInput>) => {
        form.setData(
            'days',
            form.data.days.map((day, position) => (position === index ? { ...day, ...changes } : day)),
        );
    };

    const addDay = () => {
        const last = form.data.days[form.data.days.length - 1];
        const nextDate = last?.date ? new Date(`${last.date}T12:00:00Z`) : null;

        if (nextDate) {
            nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        }

        form.setData('days', [...form.data.days, { ...emptyDay(last?.start_time ?? defaults.start_time, nextDate ? nextDate.toISOString().slice(0, 10) : ''), halaqa_ids: [] }]);
    };

    const removeDay = (index: number) => {
        form.setData(
            'days',
            form.data.days.filter((_, position) => position !== index),
        );
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (editing) {
            form.put(route('exams.update', exam.id));
        } else {
            form.post(route('exams.store'));
        }
    };

    return (
        <AppLayout
            title={editing ? t('Edit exam') : t('New exam')}
            description={editing ? exam.title : t('You can plan the exam weeks ahead. The teachers are told at once, and the students of every halaqa are told about their day.')}
            back={{ href: editing ? route('exams.show', exam.id) : route('exams.index') }}
        >
            <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader title={t('Basic information')} />
                        <CardBody className="grid gap-5 sm:grid-cols-2">
                            {choosesAcademy && (
                                <Field label={t('Academy')} error={errors.academy_id} required className="sm:col-span-2">
                                    <Select
                                        value={form.data.academy_id}
                                        onChange={(event) => form.setData((data) => ({ ...data, academy_id: event.target.value === '' ? '' : Number(event.target.value), days: data.days.map((day) => ({ ...day, halaqa_ids: [] })) }))}
                                        aria-invalid={!!errors.academy_id}
                                    >
                                        <option value="">{t('Choose the academy')}</option>
                                        {academies.map((academy) => (
                                            <option key={academy.id} value={academy.id}>
                                                {academy.name}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                            )}
                            <Field label={t('Exam title')} error={errors.title} required className="sm:col-span-2">
                                <Input
                                    value={form.data.title}
                                    onChange={(event) => form.setData('title', event.target.value)}
                                    placeholder={t('For example: End of term exam, Juz Amma')}
                                    aria-invalid={!!errors.title}
                                />
                            </Field>
                            <Field label={t('Maximum score')} error={errors.max_score} required hint={t('Every result is a grade plus a score out of this number; the percentage is computed from it.')}>
                                <Input type="number" min={1} max={1000} dir="ltr" value={form.data.max_score} onChange={(event) => form.setData('max_score', Number(event.target.value))} />
                            </Field>
                            <Field label={t('Description')} error={errors.description} className="sm:col-span-2" hint={t('What the students should prepare. Shown to them with the exam.')}>
                                <Textarea value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} />
                            </Field>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader
                            title={t('Exam days')}
                            description={t('Every day has its own halaqat, examiners and queue. Times are in :timezone.', { timezone: effectiveTimezone })}
                            icon={CalendarPlus}
                            actions={
                                <Button type="button" variant="secondary" size="sm" onClick={addDay}>
                                    <CalendarPlus />
                                    {t('Add a day')}
                                </Button>
                            }
                        />
                        <CardBody className="space-y-5">
                            {errors.days && <p className="text-xs font-medium text-rose-600">{errors.days}</p>}
                            {form.data.days.map((day, index) => {
                                const locked = day.status !== undefined && day.status !== 'scheduled';

                                return (
                                    <div key={day.id ?? `new-${index}`} className={cn('rounded-2xl border p-4 sm:p-5', locked ? 'border-line bg-surface-muted/50' : 'border-line')}>
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <h4 className="flex items-center gap-2 font-bold text-ink">
                                                <span className="flex size-7 items-center justify-center rounded-full bg-primary-600 text-xs text-white">{index + 1}</span>
                                                {day.date ? dates.day(day.date, { weekday: 'long' }) : t('Day :number', { number: index + 1 })}
                                                {locked && (
                                                    <span className="inline-flex items-center gap-1 text-xs font-normal text-muted">
                                                        <Lock className="size-3.5" />
                                                        {day.status === 'live' ? t('Running now') : t('Closed')}
                                                    </span>
                                                )}
                                            </h4>
                                            {!locked && form.data.days.length > 1 && (
                                                <Button type="button" variant="ghost" size="icon-sm" className="hover:text-rose-600" onClick={() => removeDay(index)} aria-label={t('Remove the day')}>
                                                    <Trash />
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-3">
                                            <Field label={t('Date')} error={errors[`days.${index}.date`]} required>
                                                <Input type="date" value={day.date} disabled={locked} onChange={(event) => updateDay(index, { date: event.target.value })} aria-invalid={!!errors[`days.${index}.date`]} />
                                            </Field>
                                            <Field label={t('Start time')} error={errors[`days.${index}.start_time`]} required>
                                                <Input type="time" value={day.start_time} disabled={locked} onChange={(event) => updateDay(index, { start_time: event.target.value })} />
                                            </Field>
                                            <Field label={t('End time')} error={errors[`days.${index}.end_time`]} hint={t('Leave it empty to close the day yourself.')}>
                                                <Input type="time" value={day.end_time} disabled={locked} onChange={(event) => updateDay(index, { end_time: event.target.value })} />
                                            </Field>
                                        </div>

                                        <Field label={t('Halaqat examined on this day')} error={errors[`days.${index}.halaqa_ids`]} required className="mt-4">
                                            <CheckboxList
                                                options={halaqaOptions}
                                                value={day.halaqa_ids}
                                                onChange={(ids) => updateDay(index, { halaqa_ids: ids })}
                                                showAvatars={false}
                                                emptyText={choosesAcademy && form.data.academy_id === '' ? t('Choose the academy first to list its halaqat.') : t('No active halaqat in the academy.')}
                                            />
                                        </Field>
                                    </div>
                                );
                            })}
                        </CardBody>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="lg:sticky lg:top-24">
                        <CardHeader title={t('How it works')} icon={Info} />
                        <CardBody>
                            <ol className="space-y-3 text-sm leading-relaxed text-muted">
                                <li>{t('1. Save the exam: the teachers are told, and every student of the chosen halaqat is told about their day.')}</li>
                                <li>{t('2. On the exam page, add the examiners of every day (teachers of the academy, or invited examiners with a link) and share the students among them.')}</li>
                                <li>{t('3. On the day, open it: everyone meets in the main hall for your opening word, then every student waits in the hall of their examiner and is called into the private room in turn.')}</li>
                                <li>{t('4. Results stay with you and the teachers until you send them to the students.')}</li>
                            </ol>
                            <div className="mt-5 flex flex-col gap-2">
                                <Button type="submit" loading={form.processing}>
                                    <Save />
                                    {editing ? t('Save changes') : t('Create the exam')}
                                </Button>
                                <LinkButton href={editing ? route('exams.show', exam.id) : route('exams.index')} variant="secondary">
                                    {t('Cancel')}
                                </LinkButton>
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </form>
        </AppLayout>
    );
}
