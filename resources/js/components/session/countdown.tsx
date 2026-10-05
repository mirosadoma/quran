import { useCountdown } from '@/hooks/use-countdown';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function Countdown({ target, light = false, className }: { target: string; light?: boolean; className?: string }) {
    const { t } = useTrans();
    const countdown = useCountdown(target);

    const parts = [
        ...(countdown.days > 0 ? [{ value: countdown.days, label: t('days') }] : []),
        { value: countdown.hours, label: t('hours') },
        { value: countdown.minutes, label: t('minutes') },
        { value: countdown.seconds, label: t('seconds') },
    ];

    return (
        <div className={cn('flex gap-2', className)} dir="ltr">
            {parts.map((part) => (
                <div
                    key={part.label}
                    className={cn(
                        'flex min-w-14 flex-col items-center rounded-2xl px-2 py-2',
                        light ? 'bg-white/10 text-white ring-1 ring-white/15 backdrop-blur' : 'bg-surface-muted text-ink ring-1 ring-line',
                    )}
                >
                    <span className="text-2xl font-bold tabular-nums leading-none">{String(part.value).padStart(2, '0')}</span>
                    <span className={cn('mt-1 text-[10px]', light ? 'text-white/70' : 'text-muted')}>{part.label}</span>
                </div>
            ))}
        </div>
    );
}
