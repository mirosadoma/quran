import { Link } from '@inertiajs/react';
import { BookOpen, GraduationCap, MapPin, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { AcademyLogo } from '@/components/academy/academy-logo';
import { IslamicPattern } from '@/components/brand';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { cn, formatNumber } from '@/lib/utils';
import type { AcademyItem } from '@/types';

interface AcademyCardProps {
    academy: AcademyItem;
    /** Where the name of the academy leads (its public page). */
    href?: string;
    /** Buttons at the bottom of the card (join, view...). */
    action?: ReactNode;
    className?: string;
}

/**
 * An academy as students discover it: its emblem, category, place and numbers.
 */
export function AcademyCard({ academy, href, action, className }: AcademyCardProps) {
    const { t, locale } = useTrans();
    const labels = useLabels();

    const numbers = [
        { icon: BookOpen, label: t('Halaqat'), value: academy.counts.halaqat },
        { icon: GraduationCap, label: t('Teachers'), value: academy.counts.teachers },
        { icon: Users, label: t('Students'), value: academy.counts.students },
    ].filter((item) => item.value !== null);

    const name = <h3 className="text-lg leading-snug font-bold text-ink">{academy.name}</h3>;

    return (
        <article className={cn('flex flex-col overflow-hidden rounded-3xl border border-line bg-surface transition duration-200 hover:shadow-xl hover:shadow-primary-950/5', className)}>
            <div className="relative h-20 overflow-hidden bg-linear-to-br from-primary-700 via-primary-800 to-primary-950 px-5 pt-3.5">
                <IslamicPattern className="text-gold-300/12" size={40} />
                <div className="relative flex flex-wrap justify-end gap-1.5">
                    <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur">
                        {labels.halaqaGender[academy.gender]}
                    </span>
                    {!academy.accepts_requests && (
                        <span className="rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-semibold text-white">{t('Not accepting students')}</span>
                    )}
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-4 p-5 pt-0">
                <div className="-mt-8 flex items-end gap-3">
                    <AcademyLogo academy={academy} size="lg" className="ring-4 ring-surface" />
                </div>

                <div className="min-w-0">
                    {href ? (
                        <Link href={href} className="transition hover:text-primary-700 dark:hover:text-primary-300">
                            {name}
                        </Link>
                    ) : (
                        name
                    )}
                    {academy.tagline && <p className="mt-1 text-sm leading-relaxed text-muted">{academy.tagline}</p>}
                    {academy.location && (
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
                            <MapPin className="size-3.5 shrink-0 text-gold-600" />
                            {academy.location}
                        </p>
                    )}
                </div>

                {numbers.length > 0 && (
                    <dl className="mt-auto grid grid-cols-3 divide-x divide-line rounded-2xl bg-surface-muted py-2.5 text-center rtl:divide-x-reverse">
                        {numbers.map((item) => (
                            <div key={item.label} className="min-w-0 px-1">
                                <dt className="flex items-center justify-center gap-1 text-[11px] text-muted">
                                    <item.icon className="size-3.5" />
                                    <span className="truncate">{item.label}</span>
                                </dt>
                                <dd className="mt-0.5 font-bold text-ink tabular-nums">{formatNumber(item.value ?? 0, locale)}</dd>
                            </div>
                        ))}
                    </dl>
                )}

                {action && <div className="flex flex-wrap gap-2">{action}</div>}
            </div>
        </article>
    );
}
