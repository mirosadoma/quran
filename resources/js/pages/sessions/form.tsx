import { useForm } from '@inertiajs/react';
import { CalendarCheck, CalendarClock, Video } from 'lucide-react';
import type { FormEvent } from 'react';
import { MeetingProviderPicker } from '@/components/meeting-provider-picker';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Checkbox, Field, Input, Select } from '@/components/ui/form';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import type { HalaqaRef, MeetingProvider, ProviderOption } from '@/types';

interface HalaqaOption extends HalaqaRef {
    duration_minutes: number;
    meeting_provider: MeetingProvider;
    meeting_url: string | null;
}

interface SessionFormProps {
    session: {
        id: number;
        halaqa_id: number;
        halaqa: HalaqaRef;
        title: string | null;
        date: string;
        time: string;
        duration_minutes: number;
        meeting_provider: MeetingProvider;
        meeting_url: string | null;
    } | null;
    halaqat: HalaqaOption[];
    providers: ProviderOption[];
    defaults: { halaqa_id: number | null; date: string; time: string } | null;
}

export default function SessionForm({ session, halaqat, providers, defaults }: SessionFormProps) {
    const { t } = useTrans();
    const editing = session !== null;
    const initialHalaqa = halaqat.find((halaqa) => halaqa.id === defaults?.halaqa_id) ?? halaqat[0];

    const form = useForm({
        halaqa_id: session?.halaqa_id ?? initialHalaqa?.id ?? ('' as number | ''),
        title: session?.title ?? '',
        date: session?.date ?? defaults?.date ?? '',
        time: session?.time ?? defaults?.time ?? '',
        duration_minutes: session?.duration_minutes ?? initialHalaqa?.duration_minutes ?? 60,
        meeting_provider: session?.meeting_provider ?? initialHalaqa?.meeting_provider ?? ('jitsi' as MeetingProvider),
        meeting_url: session?.meeting_url ?? '',
        notify: true,
    });

    const chooseHalaqa = (id: number) => {
        const halaqa = halaqat.find((item) => item.id === id);

        form.setData((data) => ({
            ...data,
            halaqa_id: id,
            duration_minutes: halaqa?.duration_minutes ?? data.duration_minutes,
            meeting_provider: halaqa?.meeting_provider ?? data.meeting_provider,
            meeting_url: halaqa?.meeting_url ?? '',
        }));
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (editing) {
            form.transform(({ halaqa_id: _halaqa, ...data }) => data);
            form.put(route('sessions.update', session.id));
        } else {
            form.transform((data) => data);
            form.post(route('sessions.store'));
        }
    };

    return (
        <AppLayout
            title={editing ? t('Edit session') : t('Schedule a session')}
            description={editing ? session.halaqa.name : t('An extra or make-up session outside the weekly schedule.')}
            back={{ href: editing ? route('sessions.show', session.id) : route('sessions.index') }}
        >
            <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
                <Card>
                    <CardHeader title={t('Session details')} icon={CalendarClock} />
                    <CardBody className="grid gap-5 sm:grid-cols-2">
                        {!editing && (
                            <Field label={t('Halaqa')} error={form.errors.halaqa_id} required className="sm:col-span-2">
                                <Select value={form.data.halaqa_id} onChange={(event) => chooseHalaqa(Number(event.target.value))}>
                                    {halaqat.map((halaqa) => (
                                        <option key={halaqa.id} value={halaqa.id}>
                                            {halaqa.name}
                                        </option>
                                    ))}
                                </Select>
                            </Field>
                        )}
                        <Field label={t('Title')} error={form.errors.title} hint={t('Optional. The halaqa name is used by default.')} className="sm:col-span-2">
                            <Input
                                value={form.data.title}
                                onChange={(event) => form.setData('title', event.target.value)}
                                placeholder={t('For example: Make-up session for Surah Al-Mulk')}
                            />
                        </Field>
                        <Field label={t('Date')} error={form.errors.date} required>
                            <Input type="date" value={form.data.date} onChange={(event) => form.setData('date', event.target.value)} />
                        </Field>
                        <Field label={t('Start time')} error={form.errors.time} required hint={t('In your timezone')}>
                            <Input type="time" value={form.data.time} onChange={(event) => form.setData('time', event.target.value)} />
                        </Field>
                        <Field label={t('Duration (minutes)')} error={form.errors.duration_minutes} required>
                            <Input
                                type="number"
                                min={10}
                                max={300}
                                step={5}
                                value={form.data.duration_minutes}
                                onChange={(event) => form.setData('duration_minutes', Number(event.target.value))}
                            />
                        </Field>
                    </CardBody>
                </Card>

                <Card>
                    <CardHeader title={t('Meeting')} icon={Video} />
                    <CardBody className="space-y-5">
                        <MeetingProviderPicker
                            providers={providers}
                            value={form.data.meeting_provider}
                            onChange={(value) => form.setData('meeting_provider', value)}
                        />
                        {form.data.meeting_provider === 'manual' && (
                            <Field label={t('Meeting link')} error={form.errors.meeting_url}>
                                <Input
                                    dir="ltr"
                                    value={form.data.meeting_url}
                                    onChange={(event) => form.setData('meeting_url', event.target.value)}
                                    placeholder="https://"
                                />
                            </Field>
                        )}
                    </CardBody>
                    <CardFooter className="justify-between">
                        <Checkbox
                            label={editing ? t('Notify the students if the time changes') : t('Notify the students')}
                            checked={form.data.notify}
                            onChange={(event) => form.setData('notify', event.target.checked)}
                        />
                        <div className="flex gap-2">
                            <LinkButton href={editing ? route('sessions.show', session.id) : route('sessions.index')} variant="ghost">
                                {t('Cancel')}
                            </LinkButton>
                            <Button type="submit" loading={form.processing}>
                                <CalendarCheck />
                                {editing ? t('Save changes') : t('Schedule the session')}
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </form>
        </AppLayout>
    );
}
