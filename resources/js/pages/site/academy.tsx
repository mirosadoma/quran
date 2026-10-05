import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, BookOpen, CircleCheckBig, Clock, GraduationCap, LogIn, Mail, MapPin, Phone, School, UserPlus, Users } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { AcademyLogo } from '@/components/academy/academy-logo';
import { JoinAcademyDialog } from '@/components/academy/join-dialog';
import { IslamicPattern } from '@/components/brand';
import { ScheduleChips } from '@/components/halaqa/schedule-chips';
import { Button, LinkButton } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import PublicLayout from '@/layouts/public-layout';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { cn, colorOf, formatNumber } from '@/lib/utils';
import type { AcademyItem, HalaqaGender, HalaqaLevel, ScheduleSlot } from '@/types';

interface PublicHalaqa {
    id: number;
    name: string;
    description: string | null;
    color: string;
    gender: HalaqaGender;
    level: HalaqaLevel | null;
    schedule: ScheduleSlot[];
    timezone: string;
    duration_minutes: number;
    teacher: string | null;
    students_count: number;
    capacity: number | null;
}

interface AcademyPageProps {
    academy: AcademyItem;
    halaqat: PublicHalaqa[];
    /** The visitor's relation to the academy (null for a guest). */
    membership: { member: boolean; in_another: boolean; can_join: boolean; pending: boolean } | null;
}

function JoinPanel({ academy, membership, onJoin }: { academy: AcademyItem; membership: AcademyPageProps['membership']; onJoin: () => void }) {
    const { t } = useTrans();

    let icon = UserPlus;
    let title: string = t('Join :academy', { academy: academy.name });
    let text: string;
    let actions: ReactNode = null;

    if (membership?.member) {
        icon = CircleCheckBig;
        title = t('You study at this academy');
        text = t('Your halaqat and sessions are in your account.');
        actions = (
            <LinkButton href={route('my-academy')} className="w-full">
                {t('Go to my academy')}
            </LinkButton>
        );
    } else if (membership?.pending) {
        icon = Clock;
        title = t('Your request is waiting for an answer');
        text = t('The manager of the academy will answer you soon, and you will be notified.');
        actions = (
            <LinkButton href={route('my-academy')} variant="secondary" className="w-full">
                {t('View my request')}
            </LinkButton>
        );
    } else if (!academy.accepts_requests) {
        icon = Clock;
        text = t('The academy does not accept new students at the moment. Have a look at the other academies.');
        actions = (
            <LinkButton href={route('site.academies')} variant="secondary" className="w-full">
                {t('Browse the academies')}
            </LinkButton>
        );
    } else if (membership === null) {
        text = t('Create a free account, then send your request to the academy. Its manager answers you.');
        actions = (
            <>
                <LinkButton href={route('register', { academy: academy.slug })} className="w-full">
                    <UserPlus />
                    {t('Create an account and join')}
                </LinkButton>
                <LinkButton href={route('my-academy', { join: academy.slug })} variant="secondary" className="w-full">
                    <LogIn className="rtl:rotate-180" />
                    {t('I already have an account')}
                </LinkButton>
            </>
        );
    } else if (membership.in_another) {
        text = t('You study at another academy. Leave it first from "My academy" to join this one.');
        actions = (
            <LinkButton href={route('my-academy')} variant="secondary" className="w-full">
                {t('My academy')}
            </LinkButton>
        );
    } else if (membership.can_join) {
        text = t('Send your request with a word about yourself; the manager of the academy answers you.');
        actions = (
            <Button className="w-full" onClick={onJoin}>
                <UserPlus />
                {t('Ask to join')}
            </Button>
        );
    } else {
        text = t('Joining an academy is for student accounts.');
    }

    const Icon = icon;

    return (
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-xl shadow-primary-950/5">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                <Icon className="size-6" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-ink">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            {actions && <div className="mt-5 space-y-2">{actions}</div>}
        </div>
    );
}

export default function AcademyPage({ academy, halaqat, membership }: AcademyPageProps) {
    const { t, locale } = useTrans();
    const labels = useLabels();
    const { auth } = usePage().props;
    const [joining, setJoining] = useState(false);

    const contacts = [
        { icon: MapPin, value: academy.location },
        { icon: Mail, value: academy.email, href: academy.email ? `mailto:${academy.email}` : undefined, ltr: true },
        { icon: Phone, value: academy.phone, href: academy.phone ? `tel:${academy.phone}` : undefined, ltr: true },
    ].filter((item) => item.value);

    const numbers = [
        { icon: BookOpen, label: t('Halaqat'), value: academy.counts.halaqat ?? 0 },
        { icon: GraduationCap, label: t('Teachers'), value: academy.counts.teachers ?? 0 },
        { icon: Users, label: t('Students'), value: academy.counts.students ?? 0 },
    ];

    return (
        <PublicLayout title={academy.name} description={academy.tagline ?? academy.description ?? undefined}>
            <section className="relative overflow-hidden bg-sidebar text-white">
                <IslamicPattern className="text-gold-300/[0.09]" size={72} />
                <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
                    <Link href={route('site.academies')} className="inline-flex items-center gap-1.5 text-sm font-medium text-sidebar-ink/70 transition hover:text-white">
                        <ArrowRight className="size-4 ltr:rotate-180" />
                        {t('All academies')}
                    </Link>
                    <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-center">
                        <AcademyLogo academy={academy} size="lg" className="size-24 ring-4 ring-white/10" />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-3xl font-bold sm:text-4xl">{academy.name}</h1>
                                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">{labels.halaqaGender[academy.gender]}</span>
                            </div>
                            {academy.tagline && <p className="mt-2 text-base text-sidebar-ink/80 sm:text-lg">{academy.tagline}</p>}
                            {contacts.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-sidebar-ink/75">
                                    {contacts.map((item) =>
                                        item.href ? (
                                            <a key={item.value} href={item.href} className="inline-flex items-center gap-1.5 hover:text-white" dir={item.ltr ? 'ltr' : undefined}>
                                                <item.icon className="size-4 text-gold-300" />
                                                {item.value}
                                            </a>
                                        ) : (
                                            <span key={item.value} className="inline-flex items-center gap-1.5">
                                                <item.icon className="size-4 text-gold-300" />
                                                {item.value}
                                            </span>
                                        ),
                                    )}
                                </div>
                            )}
                        </div>
                        <dl className="grid grid-cols-3 gap-2 md:w-80">
                            {numbers.map((item) => (
                                <div key={item.label} className="rounded-2xl bg-white/[0.07] px-2 py-3 text-center ring-1 ring-white/10">
                                    <dd className="text-2xl font-bold tabular-nums">{formatNumber(item.value, locale)}</dd>
                                    <dt className="mt-0.5 text-xs text-sidebar-ink/70">{item.label}</dt>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>
            </section>

            <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_22rem] lg:px-8">
                <div className="order-2 min-w-0 space-y-8 lg:order-1">
                    {academy.description && (
                        <section>
                            <h2 className="text-xl font-bold text-ink">{t('About the academy')}</h2>
                            <p className="mt-3 leading-loose whitespace-pre-line text-ink/90">{academy.description}</p>
                        </section>
                    )}

                    <section>
                        <h2 className="text-xl font-bold text-ink">{t('Its halaqat')}</h2>
                        <p className="mt-1 text-sm text-muted">{t('The weekly times of every halaqa, in its own timezone.')}</p>
                        {halaqat.length === 0 ? (
                            <EmptyState icon={BookOpen} title={t('No halaqat yet')} compact className="mt-4 rounded-3xl border border-line bg-surface" />
                        ) : (
                            <div className="mt-5 grid gap-4 md:grid-cols-2">
                                {halaqat.map((halaqa) => {
                                    const color = colorOf(halaqa.color);

                                    return (
                                        <article key={halaqa.id} className="flex flex-col overflow-hidden rounded-3xl border border-line bg-surface">
                                            <div className={cn('h-2 bg-linear-to-r', color.gradient)} />
                                            <div className="flex flex-1 flex-col gap-3 p-5">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', color.soft)}>{labels.halaqaGender[halaqa.gender]}</span>
                                                    {halaqa.level && (
                                                        <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-muted">{labels.level[halaqa.level]}</span>
                                                    )}
                                                    <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-semibold text-muted">
                                                        {t(':count minutes', { count: halaqa.duration_minutes })}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-bold text-ink">{halaqa.name}</h3>
                                                {halaqa.teacher && (
                                                    <p className="flex items-center gap-1.5 text-sm text-muted">
                                                        <School className="size-4 text-gold-600" />
                                                        {halaqa.teacher}
                                                    </p>
                                                )}
                                                {halaqa.description && <p className="text-sm leading-relaxed text-muted">{halaqa.description}</p>}
                                                <ScheduleChips schedule={halaqa.schedule} />
                                                <p className="text-[11px] text-muted" dir="ltr">
                                                    {halaqa.timezone}
                                                </p>
                                                <div className="mt-auto border-t border-line pt-3">
                                                    <div className="mb-1.5 flex items-center justify-between text-xs">
                                                        <span className="text-muted">{t('Students')}</span>
                                                        <span className="font-semibold text-ink tabular-nums">
                                                            {halaqa.students_count}
                                                            {halaqa.capacity ? ` / ${halaqa.capacity}` : ''}
                                                        </span>
                                                    </div>
                                                    {halaqa.capacity ? <ProgressBar value={halaqa.students_count} max={halaqa.capacity} size="sm" barClassName={color.bar} /> : null}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                </div>

                <aside className="order-1 lg:order-2">
                    <div className="lg:sticky lg:top-24">
                        <JoinPanel academy={academy} membership={membership} onJoin={() => setJoining(true)} />
                        {auth.user === null && (
                            <p className="mt-3 px-2 text-center text-xs leading-relaxed text-muted">
                                {t('You can also use the mushaf, the adhkar and the other tools for free before joining.')}
                            </p>
                        )}
                    </div>
                </aside>
            </div>

            <JoinAcademyDialog academy={joining ? academy : null} onClose={() => setJoining(false)} />
        </PublicLayout>
    );
}
