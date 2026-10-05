import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';

export function Pagination({ data, className }: { data: Paginated<unknown>; className?: string }) {
    const { t } = useTrans();

    if (data.last_page <= 1) {
        return null;
    }

    const pages = data.links.slice(1, -1);
    const arrow = 'inline-flex size-9 items-center justify-center rounded-xl border border-line bg-surface text-muted transition hover:text-ink';

    return (
        <nav className={cn('flex flex-col items-center justify-between gap-3 sm:flex-row', className)}>
            <p className="text-xs text-muted">
                {t('Showing :from to :to of :total', { from: data.from, to: data.to, total: data.total })}
            </p>
            <div className="flex items-center gap-1">
                {data.prev_page_url ? (
                    <Link href={data.prev_page_url} preserveScroll className={arrow} aria-label={t('Previous')}>
                        <ChevronLeft className="size-4 rtl:rotate-180" />
                    </Link>
                ) : (
                    <span className={cn(arrow, 'opacity-40')}>
                        <ChevronLeft className="size-4 rtl:rotate-180" />
                    </span>
                )}
                <div className="hidden items-center gap-1 sm:flex">
                    {pages.map((link, index) =>
                        link.url ? (
                            <Link
                                key={index}
                                href={link.url}
                                preserveScroll
                                className={cn(
                                    'inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-semibold transition',
                                    link.active ? 'bg-primary-700 text-white' : 'text-muted hover:bg-surface-muted hover:text-ink',
                                )}
                            >
                                {link.label}
                            </Link>
                        ) : (
                            <span key={index} className="px-1 text-muted">
                                …
                            </span>
                        ),
                    )}
                </div>
                <span dir="ltr" className="px-2 text-sm font-semibold text-ink sm:hidden">
                    {data.current_page} / {data.last_page}
                </span>
                {data.next_page_url ? (
                    <Link href={data.next_page_url} preserveScroll className={arrow} aria-label={t('Next')}>
                        <ChevronRight className="size-4 rtl:rotate-180" />
                    </Link>
                ) : (
                    <span className={cn(arrow, 'opacity-40')}>
                        <ChevronRight className="size-4 rtl:rotate-180" />
                    </span>
                )}
            </div>
        </nav>
    );
}
