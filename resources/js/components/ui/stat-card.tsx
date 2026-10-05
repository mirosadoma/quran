import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import type { Tone } from '@/lib/labels';
import { cn } from '@/lib/utils';

const iconTones: Record<Tone, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    teal: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
    gold: 'bg-gold-50 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300',
    sky: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
    rose: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    violet: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
    slate: 'bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-300',
};

interface StatCardProps {
    icon: LucideIcon;
    label: ReactNode;
    value: ReactNode;
    hint?: ReactNode;
    tone?: Tone;
    className?: string;
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'emerald', className }: StatCardProps) {
    return (
        <Card className={cn('relative overflow-hidden p-5', className)}>
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-sm font-medium text-muted">{label}</p>
                    <p className="mt-2 text-2xl font-bold tracking-tight text-ink tabular-nums sm:text-3xl">
                        {typeof value === 'string' && /^[\d\s/.,%+-]+$/.test(value) ? (
                            <span dir="ltr" className="inline-block whitespace-nowrap">
                                {value}
                            </span>
                        ) : (
                            value
                        )}
                    </p>
                    {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
                </div>
                <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', iconTones[tone])}>
                    <Icon className="size-5" />
                </span>
            </div>
        </Card>
    );
}
