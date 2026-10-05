import { useForm } from '@inertiajs/react';
import { CalendarClock, Check, Save, Users, Video } from 'lucide-react';
import { type FormEvent, useMemo } from 'react';
import { MeetingProviderPicker } from '@/components/meeting-provider-picker';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/form';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { cn, colorOf } from '@/lib/utils';
import type { Gender, HalaqaGender, HalaqaItem, HalaqaLevel, MeetingProvider, ProviderOption, ScheduleSlot } from '@/types';

interface HalaqaFormProps {
    halaqa: (HalaqaItem & { teacher_id: number | null; meeting_url: string | null; student_ids: number[] }) | null;
    teachers: { id: number; name: string; gender: Gender | null; academy_id: number | null }[];
    students: { id: number; name: string; gender: Gender | null; avatar_url: string | null; halaqat_count: number; academy_id: number | null }[];
    /** The academies the administration chooses from for a new halaqa (empty for a manager, or once the halaqa exists). */
    academies: { id: number; name: string }[];
    academyId: number | null;
    providers: ProviderOption[];
    timezones: string[];
    defaults: { timezone: string; meeting_provider: MeetingProvider; duration_minutes: number; color: string; gender: HalaqaGender };
}

const weekOrder = [6, 0, 1, 2, 3, 4, 5];
const colors = ['emerald', 'teal', 'sky', 'indigo', 'violet', 'rose', 'amber', 'lime'];
const durations = [30, 45, 60, 75, 90, 120];

export default function HalaqaForm({ halaqa, teachers, students, academies, academyId, providers, timezones, defaults }: HalaqaFormProps) {
    const { t } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const editing = halaqa !== null;

    const choosesAcademy = academies.length > 0;

    const form = useForm({
        academy_id: academyId ?? ('' as number | ''),
        name: halaqa?.name ?? '',
        description: halaqa?.description ?? '',
        teacher_id: halaqa?.teacher_id ?? ('' as number | ''),
        gender: halaqa?.gender ?? defaults.gender,
        level: halaqa?.level ?? ('' as HalaqaLevel | ''),
        capacity: halaqa?.capacity ?? ('' as number | ''),
        schedule: halaqa?.schedule ?? ([] as ScheduleSlot[]),
        duration_minutes: halaqa?.duration_minutes ?? defaults.duration_minutes,
        timezone: halaqa?.timezone ?? defaults.timezone,
        meeting_provider: halaqa?.meeting_provider ?? defaults.meeting_provider,
        meeting_url: halaqa?.meeting_url ?? '',
        color: halaqa?.color ?? defaults.color,
        starts_on: halaqa?.starts_on ?? '',
        is_active: halaqa?.is_active ?? true,
        student_ids: halaqa?.student_ids ?? ([] as number[]),
    });

    const slotFor = (day: number) => form.data.schedule.find((slot) => slot.day === day);

    const toggleDay = (day: number) => {
        const exists = slotFor(day);
        const fallback = form.data.schedule[0]?.time ?? '17:00';
        form.setData(
            'schedule',
            exists ? form.data.schedule.filter((slot) => slot.day !== day) : [...form.data.schedule, { day, time: fallback }],
        );
    };

    const setTime = (day: number, time: string) => {
        form.setData(
            'schedule',
            form.data.schedule.map((slot) => (slot.day === day ? { ...slot, time } : slot)),
        );
    };

    // The administration picks the academy first: its teachers and students only.
    const inAcademy = (academy: number | null) => !choosesAcademy || academy === form.data.academy_id;
    const academyTeachers = teachers.filter((teacher) => inAcademy(teacher.academy_id));

    const chooseAcademy = (value: number | '') => {
        form.setData((data) => ({ ...data, academy_id: value, teacher_id: '', student_ids: [] }));
    };

    const studentOptions = useMemo(
        () =>
            students
                .filter((student) => !choosesAcademy || student.academy_id === form.data.academy_id)
                .filter((student) => form.data.gender === 'mixed' || !student.gender || student.gender === form.data.gender)
                .map((student) => ({
                    id: student.id,
                    name: student.name,
                    avatar_url: student.avatar_url,
                    meta: student.halaqat_count > 0 ? t('In :count halaqat', { count: student.halaqat_count }) : t('Not in a halaqa yet'),
                })),
        [students, choosesAcademy, form.data.academy_id, form.data.gender, t],
    );

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (editing) {
            form.put(route('halaqat.update', halaqa.id));
        } else {
            form.post(route('halaqat.store'));
        }
    };

    const scheduleError = Object.entries(form.errors).find(([key]) => key.startsWith('schedule'))?.[1];

    return (
        <AppLayout
            title={editing ? t('Edit halaqa') : t('New halaqa')}
            description={editing ? halaqa.name : t('Upcoming sessions and their meeting links are created automatically from the weekly schedule.')}
            back={{ href: editing ? route('halaqat.show', halaqa.id) : route('halaqat.index') }}
        >
            <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    <Card>
                        <CardHeader title={t('Basic information')} />
                        <CardBody className="grid gap-5 sm:grid-cols-2">
                            {choosesAcademy && (
                                <Field label={t('Academy')} error={form.errors.academy_id} required className="sm:col-span-2" hint={t('The halaqa, its teacher and its students belong to this academy.')}>
                                    <Select
                                        value={form.data.academy_id}
                                        onChange={(event) => chooseAcademy(event.target.value === '' ? '' : Number(event.target.value))}
                                        aria-invalid={!!form.errors.academy_id}
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
                            <Field label={t('Halaqa name')} error={form.errors.name} required className="sm:col-span-2">
                                <Input
                                    value={form.data.name}
                                    onChange={(event) => form.setData('name', event.target.value)}
                                    placeholder={t('For example: Al-Fajr halaqa for Juz Amma')}
                                    aria-invalid={!!form.errors.name}
                                />
                            </Field>
                            <Field label={t('Teacher')} error={form.errors.teacher_id}>
                                <Select
                                    value={form.data.teacher_id}
                                    onChange={(event) => form.setData('teacher_id', event.target.value === '' ? '' : Number(event.target.value))}
                                >
                                    <option value="">{t('No teacher yet')}</option>
                                    {academyTeachers.map((teacher) => (
                                        <option key={teacher.id} value={teacher.id}>
                                            {teacher.name}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label={t('Level')} error={form.errors.level}>
                                <Select value={form.data.level} onChange={(event) => form.setData('level', event.target.value as HalaqaLevel | '')}>
                                    <option value="">{t('Not specified')}</option>
                                    {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                                        <option key={level} value={level}>
                                            {labels.level[level]}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label={t('Category')} error={form.errors.gender} className="sm:col-span-2">
                                <div className="grid grid-cols-3 gap-2">
                                    {(['male', 'female', 'mixed'] as const).map((gender) => (
                                        <button
                                            key={gender}
                                            type="button"
                                            onClick={() => form.setData('gender', gender)}
                                            className={cn(
                                                'rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                                                form.data.gender === gender
                                                    ? 'border-primary-600 bg-primary-50 text-primary-800 dark:bg-primary-500/10 dark:text-primary-200'
                                                    : 'border-line text-muted hover:border-line-strong',
                                            )}
                                        >
                                            {labels.halaqaGender[gender]}
                                        </button>
                                    ))}
                                </div>
                            </Field>
                            <Field label={t('Description')} error={form.errors.description} className="sm:col-span-2">
                                <Textarea value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} />
                            </Field>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader
                            title={t('Weekly schedule')}
                            description={t('Choose the days and the start time of each session.')}
                            icon={CalendarClock}
                        />
                        <CardBody className="space-y-5">
                            <div className="grid gap-2 sm:grid-cols-2">
                                {weekOrder.map((day) => {
                                    const slot = slotFor(day);

                                    return (
                                        <div
                                            key={day}
                                            className={cn(
                                                'flex items-center gap-3 rounded-2xl border px-3 py-2 transition',
                                                slot ? 'border-primary-500/50 bg-primary-50/50 dark:bg-primary-500/5' : 'border-line',
                                            )}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => toggleDay(day)}
                                                className="flex flex-1 items-center gap-3 py-1 text-start"
                                            >
                                                <span
                                                    className={cn(
                                                        'flex size-5 items-center justify-center rounded-md border',
                                                        slot ? 'border-primary-600 bg-primary-600 text-white' : 'border-line-strong',
                                                    )}
                                                >
                                                    {slot && <Check className="size-3.5" strokeWidth={3} />}
                                                </span>
                                                <span className={cn('text-sm font-semibold', slot ? 'text-ink' : 'text-muted')}>{dates.dayName(day)}</span>
                                            </button>
                                            {slot && (
                                                <input
                                                    type="time"
                                                    value={slot.time}
                                                    onChange={(event) => setTime(day, event.target.value)}
                                                    className="h-9 rounded-lg border border-line bg-surface px-2 text-sm text-ink outline-none focus:border-primary-500"
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {scheduleError && <p className="text-xs font-medium text-rose-600">{scheduleError}</p>}

                            <div className="grid gap-5 sm:grid-cols-3">
                                <Field label={t('Session duration')} error={form.errors.duration_minutes}>
                                    <Select value={form.data.duration_minutes} onChange={(event) => form.setData('duration_minutes', Number(event.target.value))}>
                                        {Array.from(new Set([...durations, form.data.duration_minutes])).sort((a, b) => a - b).map((minutes) => (
                                            <option key={minutes} value={minutes}>
                                                {t(':count minutes', { count: minutes })}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                                <Field label={t('Timezone of the schedule')} error={form.errors.timezone}>
                                    <Select value={form.data.timezone} onChange={(event) => form.setData('timezone', event.target.value)}>
                                        {timezones.map((timezone) => (
                                            <option key={timezone} value={timezone}>
                                                {timezone}
                                            </option>
                                        ))}
                                    </Select>
                                </Field>
                                <Field label={t('Starts on')} error={form.errors.starts_on} hint={t('Optional')}>
                                    <Input type="date" value={form.data.starts_on} onChange={(event) => form.setData('starts_on', event.target.value)} />
                                </Field>
                            </div>
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title={t('Meetings')} description={t('Where the live sessions of this halaqa take place.')} icon={Video} />
                        <CardBody className="space-y-5">
                            <MeetingProviderPicker
                                providers={providers}
                                value={form.data.meeting_provider}
                                onChange={(value) => form.setData('meeting_provider', value)}
                            />
                            {form.data.meeting_provider === 'manual' && (
                                <Field
                                    label={t('Meeting link')}
                                    error={form.errors.meeting_url}
                                    hint={t('A permanent Google Meet, Zoom or Teams link used for every session of this halaqa.')}
                                >
                                    <Input
                                        dir="ltr"
                                        value={form.data.meeting_url}
                                        onChange={(event) => form.setData('meeting_url', event.target.value)}
                                        placeholder="https://meet.google.com/abc-defg-hij"
                                    />
                                </Field>
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader
                            title={t('Students')}
                            description={t('Only students matching the halaqa category are listed.')}
                            icon={Users}
                        />
                        <CardBody>
                            <CheckboxList
                                options={studentOptions}
                                value={form.data.student_ids}
                                onChange={(ids) => form.setData('student_ids', ids)}
                                emptyText={
                                    choosesAcademy && form.data.academy_id === ''
                                        ? t('Choose the academy first to list its students.')
                                        : t('No students available. Add students from the users page first.')
                                }
                            />
                            {form.errors.student_ids && <p className="mt-2 text-xs font-medium text-rose-600">{form.errors.student_ids}</p>}
                        </CardBody>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="lg:sticky lg:top-24">
                        <CardHeader title={t('Settings')} />
                        <CardBody className="space-y-5">
                            <Field label={t('Color')}>
                                <div className="flex flex-wrap gap-2">
                                    {colors.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => form.setData('color', color)}
                                            aria-label={color}
                                            className={cn(
                                                'size-9 rounded-xl transition',
                                                colorOf(color).dot,
                                                form.data.color === color ? 'ring-4 ring-offset-2 ring-offset-surface ring-primary-500/40 scale-110' : 'hover:scale-105',
                                            )}
                                        />
                                    ))}
                                </div>
                            </Field>
                            <Field label={t('Capacity (students)')} error={form.errors.capacity} hint={t('Leave empty for no limit')}>
                                <Input
                                    type="number"
                                    min={1}
                                    value={form.data.capacity}
                                    onChange={(event) => form.setData('capacity', event.target.value === '' ? '' : Number(event.target.value))}
                                />
                            </Field>
                            <Switch
                                checked={form.data.is_active}
                                onChange={(value) => form.setData('is_active', value)}
                                label={t('Active halaqa')}
                                description={t('Archived halaqat keep their history but no new sessions are created.')}
                            />
                            <div className="flex flex-col gap-2 border-t border-line pt-5">
                                <Button type="submit" size="lg" loading={form.processing}>
                                    <Save />
                                    {editing ? t('Save changes') : t('Create the halaqa')}
                                </Button>
                                <LinkButton href={editing ? route('halaqat.show', halaqa.id) : route('halaqat.index')} variant="ghost">
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
