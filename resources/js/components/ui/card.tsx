import type { LucideIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            className={cn('rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgb(15_40_30/0.04)]', className)}
            {...props}
        />
    );
}

interface CardHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    icon?: LucideIcon;
    actions?: ReactNode;
    className?: string;
}

export function CardHeader({ title, description, icon: Icon, actions, className }: CardHeaderProps) {
    return (
        <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6', className)}>
            <div className="flex min-w-0 items-start gap-3">
                {Icon && (
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                        <Icon className="size-4.5" />
                    </span>
                )}
                <div className="min-w-0">
                    <h3 className="font-bold text-ink">{title}</h3>
                    {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
                </div>
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}

export function CardBody({ className, ...props }: ComponentProps<'div'>) {
    return <div className={cn('p-5 sm:p-6', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
    return (
        <div
            className={cn('flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-muted/60 px-5 py-3.5 sm:px-6', className)}
            {...props}
        />
    );
}
