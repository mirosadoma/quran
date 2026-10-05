import { Link, router } from '@inertiajs/react';
import { BellRing, ChevronLeft, MoonStar, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/form';
import { usePush } from '@/hooks/use-push';
import { useTrans } from '@/lib/i18n';
import type { PrayerReminderType } from '@/lib/prayers';
import { cn } from '@/lib/utils';

export interface ReminderSettings {
    is_active: boolean;
    time: string;
}

/**
 * The daily reminder of the night prayer or duha: on or off, and its time.
 */
export function ReminderCard({ type, reminder, showGuideLink = false }: { type: PrayerReminderType; reminder: ReminderSettings; showGuideLink?: boolean }) {
    const { t } = useTrans();
    const [time, setTime] = useState(reminder.time);
    const [saving, setSaving] = useState(false);
    const night = type === 'qiyam';
    const Icon = night ? MoonStar : Sun;

    useEffect(() => setTime(reminder.time), [reminder.time]);

    const save = (settings: ReminderSettings) => {
        router.put(route('prayers.reminders.update', type), { ...settings }, { preserveScroll: true, onStart: () => setSaving(true), onFinish: () => setSaving(false) });
    };

    return (
        <section
            className={cn(
                'relative overflow-hidden rounded-3xl p-5 text-white shadow-xl sm:p-6',
                night ? 'bg-linear-to-br from-indigo-950 via-primary-950 to-sidebar shadow-indigo-950/20' : 'bg-linear-to-br from-gold-500 via-gold-600 to-amber-700 shadow-gold-900/20',
            )}
        >
            {night && (
                <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden>
                    {[12, 28, 46, 63, 78, 90].map((left, index) => (
                        <span key={left} className="absolute size-1 rounded-full bg-white/70" style={{ left: `${left}%`, top: `${12 + ((index * 17) % 40)}%` }} />
                    ))}
                </div>
            )}
            <div className="pointer-events-none absolute -end-10 -top-10 size-40 rounded-full bg-white/10 blur-2xl" />

            <div className="relative flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur">
                    <Icon className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold">{night ? t('Night prayer reminder') : t('Duha reminder')}</h2>
                    <p className="mt-0.5 text-sm leading-relaxed text-white/80">
                        {night
                            ? t('Choose the time to wake you for the night prayer every day; the last third of the night is best.')
                            : t('Choose a time between sunrise and noon to be reminded of the duha prayer every day.')}
                    </p>
                </div>
                <Switch
                    checked={reminder.is_active}
                    disabled={saving}
                    onChange={(value) => save({ is_active: value, time })}
                />
            </div>

            <div className="relative mt-5 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 ring-1 ring-white/20 backdrop-blur">
                    <span className="sr-only">{t('Time')}</span>
                    <input
                        type="time"
                        value={time}
                        onChange={(event) => setTime(event.target.value)}
                        className="bg-transparent text-lg font-bold text-white outline-none [color-scheme:dark]"
                        dir="ltr"
                    />
                </label>
                {(time !== reminder.time || !reminder.is_active) && (
                    <Button variant="light" loading={saving} onClick={() => save({ is_active: true, time })}>
                        {reminder.is_active ? t('Save the time') : t('Turn on the reminder')}
                    </Button>
                )}
                {showGuideLink && (
                    <Link href={route('prayers.show', type)} className="ms-auto inline-flex items-center gap-1 text-sm font-semibold text-white/90 hover:text-white">
                        {night ? t('How to pray the night prayer') : t('How to pray duha')}
                        <ChevronLeft className="size-4 ltr:rotate-180" />
                    </Link>
                )}
            </div>

            {reminder.is_active && <PushHint />}
        </section>
    );
}

/**
 * Reminders reach a closed app only through push notifications.
 */
function PushHint() {
    const { t } = useTrans();
    const { status, enable } = usePush();
    const [busy, setBusy] = useState(false);

    if (status === 'on' || status === 'checking' || status === 'unconfigured') {
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
        <div className="relative mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-black/15 px-4 py-3 text-sm">
            <BellRing className="size-4 shrink-0" />
            <p className="min-w-0 flex-1 leading-relaxed text-white/90">
                {status === 'off'
                    ? t('Turn on notifications on this device so the reminder reaches you even when the app is closed.')
                    : t('On this device the reminder appears in the notifications of the platform; to receive it with the app closed, open the platform from its secure address and turn on notifications.')}
            </p>
            {status === 'off' && (
                <Button size="sm" variant="light" loading={busy} onClick={turnOn}>
                    {t('Turn on')}
                </Button>
            )}
        </div>
    );
}
