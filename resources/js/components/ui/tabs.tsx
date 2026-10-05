import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TabItem<T extends string> {
    value: T;
    label: ReactNode;
    count?: number;
    icon?: LucideIcon;
    href?: string;
}

interface TabsProps<T extends string> {
    items: TabItem<T>[];
    value: T;
    onChange?: (value: T) => void;
    className?: string;
}

/**
 * Pill tabs; items with an href navigate with Inertia, the others call onChange.
 */
export function Tabs<T extends string>({ items, value, onChange, className }: TabsProps<T>) {
    return (
        <div className={cn('-mx-1 overflow-x-auto px-1 pb-1', className)}>
            <div className="inline-flex min-w-max gap-1 rounded-2xl border border-line bg-surface-muted p-1">
                {items.map((item) => {
                    const active = item.value === value;
                    const classes = cn(
                        'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition',
                        active ? 'bg-surface text-ink shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink',
                    );
                    const content = (
                        <>
                            {item.icon && <item.icon className="size-4" />}
                            {item.label}
                            {item.count !== undefined && (
                                <span
                                    className={cn(
                                        'rounded-full px-1.5 py-px text-[11px] font-bold',
                                        active ? 'bg-primary-600 text-white' : 'bg-line text-muted',
                                    )}
                                >
                                    {item.count}
                                </span>
                            )}
                        </>
                    );

                    return item.href ? (
                        <Link key={item.value} href={item.href} preserveScroll className={classes}>
                            {content}
                        </Link>
                    ) : (
                        <button key={item.value} type="button" onClick={() => onChange?.(item.value)} className={classes}>
                            {content}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
