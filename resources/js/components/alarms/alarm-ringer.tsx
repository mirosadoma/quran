import { router, usePage } from '@inertiajs/react';
import { AlarmClockOff, BookOpenCheck, Clock } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { IslamicPattern } from '@/components/brand';
import { alarmIcons } from '@/components/alarms/alarm-form';
import { Button } from '@/components/ui/button';
import { isRinging, localClock, rememberDismissed, rememberSnoozed, SNOOZE_MINUTES } from '@/lib/alarms';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { startAlarmSound } from '@/lib/sounds';
import type { AlarmItem } from '@/types';

/**
 * Rings the alarms of the user on screen while the platform is open: a full-screen bell that
 * stops only when they dismiss it (for memorization and revision, by confirming they studied).
 */
export function AlarmRinger() {
    const { alarms, timezone } = usePage().props;
    const { t } = useTrans();
    const dates = useDates();
    const [tick, setTick] = useState(0);
    const [hidden, setHidden] = useState<Set<number>>(() => new Set());
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const timer = window.setInterval(() => setTick((value) => value + 1), 15_000);

        return () => window.clearInterval(timer);
    }, []);

    const ringing = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        tick;
        const clock = localClock(timezone);

        return (alarms ?? []).find((alarm) => isRinging(alarm, clock) && !hidden.has(alarm.id)) ?? null;
    }, [alarms, timezone, tick, hidden]);

    useEffect(() => {
        if (!ringing) {
            return undefined;
        }

        const stop = startAlarmSound();
        const vibrate = window.setInterval(() => navigator.vibrate?.([400, 200, 400]), 1500);

        return () => {
            stop();
            window.clearInterval(vibrate);
        };
    }, [ringing?.id]);

    if (!ringing) {
        return null;
    }

    const alarm: AlarmItem = ringing;
    const Icon = alarmIcons[alarm.kind];
    const study = alarm.kind === 'memorization' || alarm.kind === 'revision';

    const dismiss = () => {
        rememberDismissed(alarm, localClock(timezone).date);
        setHidden((current) => new Set(current).add(alarm.id));
        router.post(route('alarms.dismiss', alarm.id), {}, { preserveScroll: true, preserveState: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
    };

    const snooze = () => {
        rememberSnoozed(alarm);
        setHidden((current) => new Set(current).add(alarm.id));
        window.setTimeout(() => setHidden((current) => {
            const next = new Set(current);
            next.delete(alarm.id);

            return next;
        }), SNOOZE_MINUTES * 60_000);
    };

    const message = {
        memorization: t('Time to memorize. Open the mushaf and recite your new portion.'),
        revision: t('Time to revise. Repeat what you memorized so it stays with you.'),
        prayer: t('Time for the prayer. Perform ablution and pray before it is late.'),
        dhikr: t('Time for your adhkar. A few minutes of remembrance bring peace to the heart.'),
        custom: t('Your alarm is ringing.'),
    }[alarm.kind];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-primary-950/90 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-label={alarm.title}>
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-surface p-8 text-center shadow-2xl ring-1 ring-white/10">
                <IslamicPattern className="text-gold-500/[0.07]" size={56} />
                <div className="relative">
                    <span className="mx-auto flex size-24 items-center justify-center rounded-full bg-gold-100 text-gold-700 ring-8 ring-gold-500/20 dark:bg-gold-500/15 dark:text-gold-300">
                        <Icon className="size-11 animate-wiggle" />
                    </span>
                    <p dir="ltr" className="mt-6 text-5xl font-bold text-ink tabular-nums">
                        {dates.clock(alarm.time)}
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-ink">{alarm.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>

                    <div className="mt-8 flex flex-col gap-2">
                        <Button size="lg" variant={study ? 'success' : 'primary'} loading={busy} onClick={dismiss}>
                            {study ? <BookOpenCheck /> : <AlarmClockOff />}
                            {study ? t('I memorized and revised') : t('Done')}
                        </Button>
                        <Button variant="secondary" onClick={snooze}>
                            <Clock />
                            {t('Remind me in :count minutes', { count: SNOOZE_MINUTES })}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
