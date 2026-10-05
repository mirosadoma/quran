import { Link } from '@inertiajs/react';
import { Trophy } from 'lucide-react';
import type { ReactNode } from 'react';
import { IslamicPattern, StarOrnament } from '@/components/brand';
import { Avatar } from '@/components/ui/avatar';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { verseOfTheDay } from '@/lib/verses';
import { cn, formatNumber } from '@/lib/utils';

export function WelcomeBanner({ title, subtitle, children }: { title: ReactNode; subtitle?: ReactNode; children?: ReactNode }) {
    const dates = useDates();
    const today = new Date();

    return (
        <div className="relative mb-6 overflow-hidden rounded-3xl bg-sidebar px-6 py-7 text-white shadow-xl shadow-primary-950/10 sm:px-8">
            <IslamicPattern className="text-gold-300/[0.11]" size={64} />
            <div className="pointer-events-none absolute -end-16 -top-28 size-80 rounded-full bg-primary-400/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 start-10 size-64 rounded-full bg-gold-400/10 blur-3xl" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 text-xs font-medium text-gold-200/90">
                        <StarOrnament className="size-3 text-gold-400" />
                        {dates.hijri(today)} · {dates.date(today, { weekday: 'long', month: 'long' })}
                    </p>
                    <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h1>
                    {subtitle && <p className="mt-2 max-w-xl text-sm leading-relaxed text-sidebar-ink/80">{subtitle}</p>}
                </div>
                {children}
            </div>
        </div>
    );
}

export function VerseCard({ className }: { className?: string }) {
    const { t, locale } = useTrans();
    const verse = verseOfTheDay();

    return (
        <Card className={cn('relative overflow-hidden p-6 text-center', className)}>
            <IslamicPattern className="text-gold-500/[0.07]" size={56} />
            <p className="relative text-xs font-semibold text-gold-600 dark:text-gold-400">{t('Ayah of the day')}</p>
            <p className="quran-text relative mt-3 text-2xl text-ink" dir="rtl">
                <span className="text-gold-500">﴿</span> {verse.text} <span className="text-gold-500">﴾</span>
            </p>
            {locale === 'en' && <p className="relative mt-2 text-sm italic text-muted">{verse.translation}</p>}
            <p className="relative mt-2 text-xs text-muted">{verse.reference[locale]}</p>
        </Card>
    );
}

interface TopStudent {
    id: number;
    name: string;
    avatar_url: string | null;
    ayahs: number;
    total: number;
}

export function TopStudentsCard({ students, className }: { students: TopStudent[]; className?: string }) {
    const { t, locale } = useTrans();
    const medals = ['text-gold-500', 'text-stone-400', 'text-amber-700'];

    return (
        <Card className={className}>
            <CardHeader title={t('Top memorizers this month')} icon={Trophy} />
            {students.length === 0 ? (
                <EmptyState icon={Trophy} title={t('No memorization recorded this month yet')} compact />
            ) : (
                <ul className="divide-y divide-line">
                    {students.map((student, index) => (
                        <li key={student.id}>
                            <Link
                                href={route('progress.student', student.id)}
                                className="flex items-center gap-3 px-5 py-3 transition hover:bg-surface-muted/60 sm:px-6"
                            >
                                <span className={cn('w-5 text-center text-sm font-bold', medals[index] ?? 'text-muted')}>{index + 1}</span>
                                <Avatar name={student.name} src={student.avatar_url} size="sm" />
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-ink">{student.name}</span>
                                    <span className="block text-xs text-muted">
                                        {t('Total memorized: :count ayahs', { count: formatNumber(student.total, locale) })}
                                    </span>
                                </span>
                                <span className="rounded-full bg-gold-50 px-2.5 py-1 text-xs font-bold text-gold-700 dark:bg-gold-500/10 dark:text-gold-300">
                                    +{formatNumber(student.ayahs, locale)}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
}
