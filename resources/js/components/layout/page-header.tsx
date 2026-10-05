import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTrans } from '@/lib/i18n';

export interface PageHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    back?: { href: string; label?: string };
}

export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
    const { t } = useTrans();

    return (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
                {back && (
                    <Link
                        href={back.href}
                        className="no-print mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink"
                    >
                        <ArrowRight className="size-4 ltr:rotate-180" />
                        {back.label ?? t('Back')}
                    </Link>
                )}
                <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{title}</h1>
                {description && <div className="mt-1.5 text-sm text-muted">{description}</div>}
            </div>
            {actions && <div className="no-print flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
    );
}
