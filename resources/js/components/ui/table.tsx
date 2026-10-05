import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, children, ...props }: ComponentProps<'table'>) {
    return (
        <div className="overflow-x-auto">
            <table className={cn('w-full border-separate border-spacing-0 text-sm', className)} {...props}>
                {children}
            </table>
        </div>
    );
}

export function Th({ className, ...props }: ComponentProps<'th'>) {
    return (
        <th
            className={cn(
                'whitespace-nowrap border-b border-line bg-surface-muted px-4 py-3 text-start text-xs font-semibold text-muted first:ps-5 last:pe-5 sm:first:ps-6 sm:last:pe-6',
                className,
            )}
            {...props}
        />
    );
}

export function Td({ className, ...props }: ComponentProps<'td'>) {
    return (
        <td
            className={cn(
                'border-b border-line/70 px-4 py-3 align-middle first:ps-5 last:pe-5 sm:first:ps-6 sm:last:pe-6',
                className,
            )}
            {...props}
        />
    );
}

export function Tr({ className, ...props }: ComponentProps<'tr'>) {
    return <tr className={cn('transition hover:bg-surface-muted/60 [&:last-child>td]:border-b-0', className)} {...props} />;
}
