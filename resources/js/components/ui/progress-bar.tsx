import { cn } from '@/lib/utils';

interface ProgressBarProps {
    value: number;
    max?: number;
    className?: string;
    barClassName?: string;
    size?: 'sm' | 'md';
}

export function ProgressBar({ value, max = 100, className, barClassName, size = 'md' }: ProgressBarProps) {
    const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

    return (
        <div
            role="progressbar"
            aria-valuenow={Math.round(percent)}
            aria-valuemin={0}
            aria-valuemax={100}
            className={cn('overflow-hidden rounded-full bg-line/70', size === 'sm' ? 'h-1.5' : 'h-2.5', className)}
        >
            <div
                className={cn('h-full rounded-full bg-linear-to-l from-primary-500 to-primary-700 transition-all duration-700', barClassName)}
                style={{ width: `${percent}%` }}
            />
        </div>
    );
}
