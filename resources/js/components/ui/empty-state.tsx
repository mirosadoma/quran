import { Inbox, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: ReactNode;
    description?: ReactNode;
    action?: ReactNode;
    className?: string;
    compact?: boolean;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className, compact = false }: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}>
            <span className="relative mb-4 flex size-14 items-center justify-center">
                <span className="absolute inset-0 rotate-45 rounded-2xl bg-gold-100/70 dark:bg-gold-500/10" />
                <span className="absolute inset-0 rounded-2xl bg-primary-50 dark:bg-primary-500/10" />
                <Icon className="relative size-6 text-primary-600 dark:text-primary-300" />
            </span>
            <h3 className="font-bold text-ink">{title}</h3>
            {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
