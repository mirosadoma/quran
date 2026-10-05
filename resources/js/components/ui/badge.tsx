import type { ReactNode } from 'react';
import type { Tone } from '@/lib/labels';
import { cn } from '@/lib/utils';

const tones: Record<Tone, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20',
    teal: 'bg-teal-50 text-teal-700 ring-teal-600/15 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-400/20',
    gold: 'bg-gold-50 text-gold-700 ring-gold-600/20 dark:bg-gold-500/10 dark:text-gold-300 dark:ring-gold-400/20',
    sky: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20',
    rose: 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20',
    amber: 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20',
    violet: 'bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20',
    slate: 'bg-stone-100 text-stone-600 ring-stone-500/15 dark:bg-white/5 dark:text-stone-300 dark:ring-white/10',
};

interface BadgeProps {
    tone?: Tone;
    dot?: boolean;
    pulse?: boolean;
    className?: string;
    children: ReactNode;
}

export function Badge({ tone = 'slate', dot = false, pulse = false, className, children }: BadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset',
                tones[tone],
                className,
            )}
        >
            {dot && (
                <span className="relative flex size-1.5">
                    {pulse && <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />}
                    <span className="relative inline-flex size-1.5 rounded-full bg-current" />
                </span>
            )}
            {children}
        </span>
    );
}
