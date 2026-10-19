import { useForm } from '@inertiajs/react';
import { AlarmClock, BookOpen, HandHeart, MoonStar, Repeat, type LucideIcon } from 'lucide-react';
import { type FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Switch } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { kindPresets } from '@/lib/alarms';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { alarmKinds, useLabels } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { AlarmItem, AlarmKind } from '@/types';

export const alarmIcons: Record<AlarmKind, LucideIcon> = {
    memorization: BookOpen,
    revision: Repeat,
    prayer: MoonStar,
    dhikr: HandHeart,
    custom: AlarmClock,
};

const weekOrder = [6, 0, 1, 2, 3, 4, 5];

interface AlarmFormProps {
    open: boolean;
    onClose: () => void;
    alarm?: AlarmItem | null;
    /** Preset kind for a new alarm. */
    kind?: AlarmKind;
}

/**
 * Creating or changing an alarm: its kind, name, time and days, like the alarms of a phone.
 */
export function AlarmForm({ open, onClose, alarm = null, kind = 'memorization' }: AlarmFormProps) {
    const { t, locale } = useTrans();
    const labels = useLabels();
    const dates = useDates();

    const form = useForm<{ kind: AlarmKind; title: string; time: string; days: number[]; is_active: boolean }>({
        kind,
        title: '',
        time: kindPresets[kind].time,
        days: [],
        is_active: true,
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.clearErrors();
        form.setData({
            kind: alarm?.kind ?? kind,
            title: alarm?.title ?? kindPresets[kind].title[locale],
            time: alarm?.time ?? kindPresets[kind].time,
            days: alarm?.days ?? [],
            is_active: alarm?.is_active ?? true,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, alarm?.id, kind]);

    const chooseKind = (value: AlarmKind) => {
        const untouched = alarmKinds.some((item) => form.data.title === kindPresets[item].title[locale]) || form.data.title === '';

        form.setData((data) => ({ ...data, kind: value, title: untouched ? kindPresets[value].title[locale] : data.title }));
    };

    const toggleDay = (day: number) => {
        form.setData('days', form.data.days.includes(day) ? form.data.days.filter((item) => item !== day) : [...form.data.days, day]);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => onClose() };

        if (alarm) {
            form.put(route('alarms.update', alarm.id), options);
        } else {
            form.post(route('alarms.store'), options);
        }
    };

    const everyDay = form.data.days.length === 0 || form.data.days.length === 7;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={alarm ? t('Edit the alarm') : t('New alarm')}
            description={t('It rings at its time on the chosen days, and keeps ringing until you dismiss it.')}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" form="alarm-form" loading={form.processing}>
                        {alarm ? t('Save') : t('Add the alarm')}
                    </Button>
                </>
            }
        >
            <form id="alarm-form" onSubmit={submit} className="space-y-5">
                <Field label={t('What is it for?')} error={form.errors.kind}>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {alarmKinds.map((item) => {
                            const Icon = alarmIcons[item];

                            return (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => chooseKind(item)}
                                    className={cn(
                                        'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition',
                                        form.data.kind === item ? 'border-primary-600 bg-primary-50 text-primary-800 dark:bg-primary-500/10 dark:text-primary-200' : 'border-line text-muted hover:border-line-strong',
                                    )}
                                >
                                    <Icon className="size-5" />
                                    {labels.alarmKind[item]}
                                </button>
                            );
                        })}
                    </div>
                </Field>

                <div className="grid gap-4 sm:grid-cols-3">
                    <Field label={t('Name')} error={form.errors.title} required className="sm:col-span-2">
                        <Input value={form.data.title} onChange={(event) => form.setData('title', event.target.value)} maxLength={100} aria-invalid={!!form.errors.title} />
                    </Field>
                    <Field label={t('Time')} error={form.errors.time} required>
                        <Input type="time" dir="ltr" value={form.data.time} onChange={(event) => form.setData('time', event.target.value)} className="text-lg font-bold" />
                    </Field>
                </div>

                <Field label={t('Days')} error={form.errors.days} hint={everyDay ? t('Every day') : undefined}>
                    <div className="flex flex-wrap gap-1.5">
                        {weekOrder.map((day) => {
                            const on = form.data.days.length === 0 || form.data.days.includes(day);

                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleDay(day)}
                                    className={cn(
                                        'rounded-xl border px-3 py-2 text-xs font-semibold transition',
                                        on ? 'border-primary-600 bg-primary-600 text-white' : 'border-line text-muted hover:border-line-strong',
                                    )}
                                >
                                    {dates.dayName(day, 'short')}
                                </button>
                            );
                        })}
                    </div>
                </Field>

                {alarm && <Switch checked={form.data.is_active} onChange={(value) => form.setData('is_active', value)} label={t('Alarm on')} />}
            </form>
        </Modal>
    );
}
