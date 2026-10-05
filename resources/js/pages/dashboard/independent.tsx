import { Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, BookOpenText, Building2, Clock, HandHeart, MoonStar, Scale, Smile, Sparkles, UserPlus, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { AcademyCard } from '@/components/academy/academy-card';
import { JoinAcademyDialog } from '@/components/academy/join-dialog';
import { IslamicPattern } from '@/components/brand';
import { VerseCard, WelcomeBanner } from '@/components/dashboard/widgets';
import { PushPrompt } from '@/components/install-app';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import { cn, formatNumber } from '@/lib/utils';
import type { AcademyItem, JoinRequestItem } from '@/types';

interface DayCount {
    date: string;
    good: number;
    bad: number;
    major: number;
    repented: number;
    unrepented: number;
    net: number;
}

interface IndependentDashboardProps {
    mushafPage: number | null;
    deeds: DayCount;
    /** The voluntary prayers the user is reminded of every day. */
    reminders: ('qiyam' | 'duha')[];
    joinRequest: JoinRequestItem | null;
    academies: AcademyItem[];
}

function ToolTile({ href, icon: Icon, title, description, className }: { href: string; icon: typeof BookOpenText; title: string; description: ReactNode; className: string }) {
    return (
        <Link
            href={href}
            className={cn(
                'group relative flex items-center gap-4 overflow-hidden rounded-3xl px-5 py-5 text-white shadow-lg transition hover:-translate-y-0.5',
                className,
            )}
        >
            <IslamicPattern className="text-white/8" size={48} />
            <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                <Icon className="size-6" />
            </span>
            <span className="relative min-w-0">
                <span className="block text-lg font-bold">{title}</span>
                <span className="block text-sm text-white/80">{description}</span>
            </span>
        </Link>
    );
}

/**
 * The dashboard of a student who studies on their own: their tools for the Quran and worship, and the
 * academies they can ask to join.
 */
export default function IndependentDashboard({ mushafPage, deeds, reminders, joinRequest, academies }: IndependentDashboardProps) {
    const { t, locale } = useTrans();
    const { auth } = usePage().props;
    const [joining, setJoining] = useState<AcademyItem | null>(null);
    const waiting = joinRequest?.status === 'pending';

    const reminderText =
        reminders.length === 0
            ? t('Set a daily reminder for the night prayer')
            : reminders.includes('qiyam')
              ? t('The night prayer reminder is on')
              : t('The duha reminder is on');

    return (
        <AppLayout title={t('Dashboard')} hideHeader>
            <WelcomeBanner
                title={t('Peace be upon you, :name', { name: auth.user?.name ?? '' })}
                subtitle={t('Your space for the Quran and worship. Whenever you want to study in a halaqa with a teacher, ask to join an academy.')}
            >
                <LinkButton href={route('my-academy')} variant="gold" size="lg">
                    <Building2 />
                    {t('Browse the academies')}
                </LinkButton>
            </WelcomeBanner>

            <PushPrompt />

            {joinRequest && joinRequest.status !== 'cancelled' && joinRequest.status !== 'accepted' && (
                <div
                    className={cn(
                        'mb-6 flex flex-col gap-3 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center',
                        waiting
                            ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100'
                            : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100',
                    )}
                >
                    {waiting ? <Clock className="size-5 shrink-0" /> : <X className="size-5 shrink-0" />}
                    <div className="min-w-0 flex-1 text-sm">
                        <p className="font-semibold">
                            {waiting
                                ? t('Your request to join :academy is waiting for an answer.', { academy: joinRequest.academy?.name ?? '' })
                                : t(':academy declined your request.', { academy: joinRequest.academy?.name ?? '' })}
                        </p>
                        {joinRequest.response && <p className="mt-0.5 opacity-80">{joinRequest.response}</p>}
                        {!waiting && <p className="mt-0.5 opacity-80">{t('You can ask another academy.')}</p>}
                    </div>
                    {waiting && (
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => router.patch(route('join-requests.cancel', joinRequest.id), {}, { preserveScroll: true })}
                        >
                            {t('Cancel the request')}
                        </Button>
                    )}
                </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <ToolTile
                    href={route('mushaf.index')}
                    icon={BookOpenText}
                    title={t('The recited mushaf')}
                    description={mushafPage ? t('Continue reading from page :page', { page: mushafPage }) : t('Read, listen to the sheikhs and mark the ayahs')}
                    className="bg-linear-to-br from-primary-700 to-primary-950"
                />
                <ToolTile
                    href={route('adhkar.index')}
                    icon={HandHeart}
                    title={t('Adhkar and duas')}
                    description={t('Morning and evening adhkar, sleep, and duas from the Quran and the sunnah')}
                    className="bg-linear-to-br from-gold-500 to-gold-800"
                />
                <ToolTile
                    href={route('prayers.index')}
                    icon={MoonStar}
                    title={t('Prayer')}
                    description={reminderText}
                    className="bg-linear-to-br from-indigo-600 to-indigo-950"
                />
                <ToolTile
                    href={route('kids.index')}
                    icon={Smile}
                    title={t('Kids memorization')}
                    description={t('Short surahs with repetition, for the little ones')}
                    className="bg-linear-to-br from-sky-500 to-sky-800"
                />
                <Card className="relative overflow-hidden sm:col-span-2 xl:col-span-2">
                    <CardHeader
                        title={t('Self-accounting today')}
                        icon={Scale}
                        actions={
                            <LinkButton href={route('deeds.index')} variant="ghost" size="sm">
                                {t('Open')}
                                <ArrowLeft className="ltr:rotate-180" />
                            </LinkButton>
                        }
                    />
                    <CardBody className="grid grid-cols-3 gap-3 text-center">
                        {[
                            { label: t('Good deeds'), value: deeds.good, tone: 'text-emerald-600 dark:text-emerald-400' },
                            { label: t('Repented or expiated'), value: deeds.repented, tone: 'text-sky-600 dark:text-sky-400' },
                            { label: t('Not repented yet'), value: deeds.unrepented, tone: 'text-rose-600 dark:text-rose-400' },
                        ].map((item) => (
                            <div key={item.label} className="rounded-2xl bg-surface-muted px-2 py-3">
                                <p className={cn('text-2xl font-bold tabular-nums', item.tone)}>{formatNumber(item.value, locale)}</p>
                                <p className="mt-1 text-xs text-muted">{item.label}</p>
                            </div>
                        ))}
                    </CardBody>
                </Card>
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-3">
                <div className="min-w-0 xl:col-span-2">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="flex items-center gap-2 text-lg font-bold text-ink">
                                <Sparkles className="size-5 text-gold-500" />
                                {t('Study in a halaqa with a teacher')}
                            </h2>
                            <p className="mt-0.5 text-sm text-muted">{t('Choose an academy and send it a request; its manager answers you.')}</p>
                        </div>
                        <LinkButton href={route('my-academy')} variant="ghost" size="sm">
                            {t('View all')}
                        </LinkButton>
                    </div>
                    {academies.length === 0 ? (
                        <Card>
                            <EmptyState icon={Building2} title={t('No academies accept students at the moment')} compact />
                        </Card>
                    ) : (
                        <div className="grid gap-5 sm:grid-cols-2">
                            {academies.slice(0, 4).map((academy) => (
                                <AcademyCard
                                    key={academy.id}
                                    academy={academy}
                                    href={route('site.academy', academy.slug)}
                                    action={
                                        <Button className="w-full" variant="outline" disabled={waiting} onClick={() => setJoining(academy)}>
                                            <UserPlus />
                                            {t('Ask to join')}
                                        </Button>
                                    }
                                />
                            ))}
                        </div>
                    )}
                </div>
                <div className="min-w-0">
                    <VerseCard />
                </div>
            </div>

            <JoinAcademyDialog academy={joining} onClose={() => setJoining(null)} />
        </AppLayout>
    );
}
