import { router } from '@inertiajs/react';
import { AlarmClockPlus } from 'lucide-react';
import { useState } from 'react';
import { Button, type ButtonSize } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { cn, formatNumber } from '@/lib/utils';

/** The most minutes given at once (ExamDayController::MAX_EXTENSION_MINUTES). */
const MAX_MINUTES = 480;
const CHOICES = [10, 15, 30, 60];

/**
 * Give an exam day more time: it then closes by itself that many minutes after its end time
 * (after now when that time has passed).
 */
export function ExtendDayButton({ day, size }: { day: { id: number; ends_at: string | null }; size?: ButtonSize }) {
    const { t, locale } = useTrans();
    const dates = useDates();
    const [open, setOpen] = useState(false);
    const [minutes, setMinutes] = useState(30);
    const [busy, setBusy] = useState(false);

    if (!day.ends_at) {
        return null;
    }

    const end = new Date(day.ends_at);
    const from = end.getTime() > Date.now() ? end : new Date();
    const valid = Number.isInteger(minutes) && minutes >= 1 && minutes <= MAX_MINUTES;
    const newEnd = new Date(from.getTime() + (valid ? minutes : 0) * 60_000);

    const submit = () => {
        router.post(
            route('exams.days.extend', day.id),
            { minutes },
            { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false), onSuccess: () => setOpen(false) },
        );
    };

    return (
        <>
            <Button variant="secondary" size={size} onClick={() => setOpen(true)}>
                <AlarmClockPlus />
                {t('Extend the time')}
            </Button>

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                size="sm"
                title={t('Extend the exam day')}
                description={t('The day now ends at :time. It will close by itself at the new time.', { time: dates.time(day.ends_at) })}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setOpen(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={submit} loading={busy} disabled={!valid}>
                            <AlarmClockPlus />
                            {t('Extend until :time', { time: dates.time(newEnd.toISOString()) })}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                        {CHOICES.map((choice) => (
                            <button
                                key={choice}
                                type="button"
                                onClick={() => setMinutes(choice)}
                                aria-pressed={minutes === choice}
                                className={cn(
                                    'rounded-xl border px-2 py-2.5 text-sm font-semibold transition',
                                    minutes === choice ? 'border-primary-500 bg-primary-50 text-primary-800 dark:bg-primary-500/15 dark:text-primary-200' : 'border-line text-ink hover:border-primary-300',
                                )}
                            >
                                {t(':count minutes', { count: formatNumber(choice, locale) })}
                            </button>
                        ))}
                    </div>
                    <Field label={t('Or another number of minutes')} htmlFor={`extend-${day.id}`}>
                        <Input
                            id={`extend-${day.id}`}
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={MAX_MINUTES}
                            value={Number.isNaN(minutes) ? '' : minutes}
                            onChange={(event) => setMinutes(event.target.valueAsNumber)}
                        />
                    </Field>
                </div>
            </Modal>
        </>
    );
}
