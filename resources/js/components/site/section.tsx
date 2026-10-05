import type { ReactNode } from 'react';
import { IslamicPattern, StarOrnament } from '@/components/brand';
import { cn } from '@/lib/utils';

/**
 * The dark banner at the top of the inner pages of the website.
 */
export function PageHero({ eyebrow, title, description, children }: { eyebrow?: ReactNode; title: ReactNode; description?: ReactNode; children?: ReactNode }) {
    return (
        <section className="relative overflow-hidden bg-sidebar text-white">
            <IslamicPattern className="text-gold-300/[0.09]" size={72} />
            <div className="pointer-events-none absolute -top-32 start-1/2 size-96 -translate-x-1/2 rounded-full bg-primary-400/20 blur-3xl rtl:translate-x-1/2" />
            <div className="relative mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20">
                {eyebrow && (
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-gold-300">
                        <StarOrnament className="size-3 text-gold-400" />
                        {eyebrow}
                        <StarOrnament className="size-3 text-gold-400" />
                    </p>
                )}
                <h1 className="mt-3 text-3xl leading-tight font-bold sm:text-5xl">{title}</h1>
                {description && <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-sidebar-ink/80 sm:text-lg">{description}</p>}
                {children && <div className="mt-8">{children}</div>}
            </div>
        </section>
    );
}

/**
 * A titled section of a page of the website.
 */
export function SiteSection({
    eyebrow,
    title,
    description,
    actions,
    className,
    children,
}: {
    eyebrow?: ReactNode;
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
    children: ReactNode;
}) {
    return (
        <section className={cn('mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8', className)}>
            {(title || eyebrow) && (
                <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="max-w-2xl">
                        {eyebrow && (
                            <p className="flex items-center gap-2 text-sm font-semibold text-gold-600 dark:text-gold-400">
                                <StarOrnament className="size-3" />
                                {eyebrow}
                            </p>
                        )}
                        {title && <h2 className="mt-2 text-2xl leading-snug font-bold text-ink sm:text-4xl">{title}</h2>}
                        {description && <p className="mt-3 leading-relaxed text-muted">{description}</p>}
                    </div>
                    {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
                </div>
            )}
            {children}
        </section>
    );
}
