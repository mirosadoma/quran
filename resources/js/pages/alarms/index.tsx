import { router, usePage } from '@inertiajs/react';
import { AlarmClock, BellRing, Pencil, Plus, Trash } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AlarmForm, alarmIcons } from '@/components/alarms/alarm-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Switch } from '@/components/ui/form';
import { ConfirmDialog } from '@/components/ui/modal';
import { usePush } from '@/hooks/use-push';
import AppLayout from '@/layouts/app-layout';
import { kindPresets, nextRing } from '@/lib/alarms';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { alarmKinds, useLabels } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { AlarmItem, AlarmKind } from '@/types';

interface AlarmsProps {
    alarms: AlarmItem[];
    ring: number | null;
}

const weekOrder = [6, 0, 1, 2, 3, 4, 5];

/**
 * The alarms of the user, like the ones of a phone: memorization, revision, prayers, adhkar...
 */
export default function Alarms({ alarms }: AlarmsProps) {
    const { t } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const { timezone } = usePage().props;
    const [creating, setCreating] = useState<AlarmKind | null>(null);
    const [editing, setEditing] = useState<AlarmItem | null>(null);
    const [removing, setRemoving] = useState<AlarmItem | null>(null);
    const [processing, setProcessing] = useState(false);

    const toggle = (alarm: AlarmItem, active: boolean) => {
        router.put(route('alarms.update', alarm.id), { kind: alarm.kind, title: alarm.title, time: alarm.time, days: alarm.days ?? [], is_active: active }, { preserveScroll: true });
    };

    const remove = () => {
        if (!removing) {
            return;
        }

        router.delete(route('alarms.destroy', removing.id), {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => {
                setProcessing(false);
                setRemoving(null);
            },
        });
    };

    return (
        <AppLayout
            title={t('Alarms')}
            description={t('Set alarms for your memorization and revision, your prayers and adhkar, or anything you name. They ring on screen and on your phone until you dismiss them.')}
            actions={
                <Button onClick={() => setCreating('memorization')}>
                    <Plus />
                    {t('New alarm')}
                </Button>
            }
        >
            <PushHint />

            {alarms.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={AlarmClock}
                        title={t('No alarms yet')}
                        description={t('Start with a memorization alarm in the morning and a revision alarm in the evening.')}
                    />
                </Card>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {alarms.map((alarm) => {
                        const Icon = alarmIcons[alarm.kind];
                        const next = nextRing(alarm, timezone);

                        return (
                            <Card key={alarm.id} className={cn('flex flex-col gap-4 p-5', !alarm.is_active && 'opacity-70')}>
                                <div className="flex items-start gap-3">
                                    <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', alarm.kind === 'memorization' || alarm.kind === 'revision' ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300' : 'bg-gold-50 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300')}>
                                        <Icon className="size-5" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p dir="ltr" className="text-3xl font-bold text-ink tabular-nums">
                                            {dates.clock(alarm.time)}
                                        </p>
                                        <p className="truncate font-semibold text-ink">{alarm.title}</p>
                                        <p className="text-xs text-muted">{labels.alarmKind[alarm.kind]}</p>
                                    </div>
                                    <Switch checked={alarm.is_active} onChange={(value) => toggle(alarm, value)} />
                                </div>

                                <div className="flex flex-wrap gap-1">
                                    {weekOrder.map((day) => {
                                        const on = alarm.days === null || alarm.days.includes(day);

                                        return (
                                            <span key={day} className={cn('rounded-lg px-2 py-0.5 text-[11px] font-semibold', on ? 'bg-primary-600 text-white' : 'bg-surface-muted text-muted')}>
                                                {dates.dayName(day, 'short')}
                                            </span>
                                        );
                                    })}
                                </div>

                                <div className="mt-auto flex items-center justify-between gap-2 text-xs text-muted">
                                    <span className="inline-flex items-center gap-1">
                                        <BellRing className="size-3.5" />
                                        {next ? t('Rings :when', { when: dates.relative(next) }) : t('Off')}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Button size="icon-sm" variant="ghost" onClick={() => setEditing(alarm)} aria-label={t('Edit')}>
                                            <Pencil />
                                        </Button>
                                        <Button size="icon-sm" variant="ghost" className="hover:text-rose-600" onClick={() => setRemoving(alarm)} aria-label={t('Delete')}>
                                            <Trash />
                                        </Button>
                                    </span>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            <h2 className="mt-10 mb-3 text-lg font-bold text-ink">{t('Quick alarms')}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {alarmKinds.map((kind) => {
                    const Icon = alarmIcons[kind];

                    return (
                        <button
                            key={kind}
                            type="button"
                            onClick={() => setCreating(kind)}
                            className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-start transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-lg"
                        >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                                <Icon className="size-5" />
                            </span>
                            <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-ink">{labels.alarmKind[kind]}</span>
                                <span dir="ltr" className="block text-xs text-muted">
                                    {dates.clock(kindPresets[kind].time)}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>

            <AlarmForm open={creating !== null} onClose={() => setCreating(null)} kind={creating ?? 'memorization'} />
            <AlarmForm open={editing !== null} onClose={() => setEditing(null)} alarm={editing} kind={editing?.kind} />

            <ConfirmDialog
                open={removing !== null}
                onClose={() => setRemoving(null)}
                onConfirm={remove}
                processing={processing}
                title={t('Delete this alarm?')}
                message={removing?.title}
                confirmLabel={t('Delete')}
            />
        </AppLayout>
    );
}

/**
 * Alarms reach a closed app only through push notifications.
 */
function PushHint() {
    const { t } = useTrans();
    const { status, enable } = usePush();
    const [busy, setBusy] = useState(false);

    if (status !== 'off') {
        return null;
    }

    const turnOn = async () => {
        setBusy(true);

        try {
            if ((await enable()) === 'on') {
                toast.success(t('Notifications are on for this device.'));
            }
        } catch {
            toast.error(t('Could not turn on the notifications. Try again.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-gold-300 bg-gold-50 px-5 py-4 text-sm text-gold-900 dark:border-gold-500/30 dark:bg-gold-500/10 dark:text-gold-100">
            <BellRing className="size-5 shrink-0" />
            <p className="min-w-0 flex-1 leading-relaxed">{t('Turn on notifications on this device so the alarms reach you even when the app is closed.')}</p>
            <Button size="sm" variant="gold" loading={busy} onClick={turnOn}>
                {t('Turn on')}
            </Button>
        </div>
    );
}
