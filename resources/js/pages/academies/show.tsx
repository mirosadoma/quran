import { Link } from '@inertiajs/react';
import {
    Archive,
    ArrowRight,
    BookOpen,
    EllipsisVertical,
    ExternalLink,
    GraduationCap,
    LogIn,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Plus,
    UserPlus,
    Users,
} from 'lucide-react';
import { AcademyStatusBadge, useAcademyActions } from '@/components/academy/academy-actions';
import { AcademyLogo } from '@/components/academy/academy-logo';
import { IslamicPattern } from '@/components/brand';
import { HalaqaCard } from '@/components/halaqa/halaqa-card';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Dropdown } from '@/components/ui/dropdown';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { formatNumber } from '@/lib/utils';
import type { AcademyItem, HalaqaItem, UserItem } from '@/types';

interface AcademyShowProps {
    academy: AcademyItem;
    halaqat: HalaqaItem[];
    teachers: UserItem[];
    recentStudents: UserItem[];
    can: { administer: boolean; impersonate: boolean; forceDelete: boolean };
}

export default function AcademyShow({ academy, halaqat, teachers, recentStudents, can }: AcademyShowProps) {
    const { t, locale } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const actions = useAcademyActions();
    const manager = academy.manager;

    const contacts = [
        { icon: MapPin, value: academy.location },
        { icon: Mail, value: academy.email, ltr: true },
        { icon: Phone, value: academy.phone, ltr: true },
    ].filter((item) => item.value);

    return (
        <AppLayout title={academy.name} hideHeader>
            <Link href={route('academies.index')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
                <ArrowRight className="size-4 ltr:rotate-180" />
                {t('Academies')}
            </Link>

            {academy.archived && (
                <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-line bg-surface-muted p-4 sm:flex-row sm:items-center">
                    <Archive className="size-5 shrink-0 text-muted" />
                    <p className="flex-1 text-sm text-ink">
                        {t('This academy is archived: its members cannot sign in. Restore it to use it again, or delete it permanently.')}
                    </p>
                    <Dropdown
                        trigger={
                            <Button variant="secondary" size="sm">
                                {t('Options')}
                                <EllipsisVertical />
                            </Button>
                        }
                    >
                        {actions.items(academy, false)}
                    </Dropdown>
                </div>
            )}

            <section className="relative mb-6 overflow-hidden rounded-3xl bg-linear-to-br from-primary-800 via-primary-900 to-primary-950 p-6 text-white sm:p-8">
                <IslamicPattern className="text-gold-300/10" size={64} />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4 sm:items-center">
                        <AcademyLogo academy={academy} size="lg" className="ring-4 ring-white/10" />
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-bold sm:text-3xl">{academy.name}</h1>
                                <AcademyStatusBadge academy={academy} />
                            </div>
                            {academy.tagline && <p className="mt-1.5 text-sm text-white/75 sm:text-base">{academy.tagline}</p>}
                            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-white/70">
                                <span className="inline-flex items-center gap-1.5">
                                    <Users className="size-3.5 text-gold-300" />
                                    {labels.halaqaGender[academy.gender]}
                                </span>
                                {contacts.map((item) => (
                                    <span key={item.value} className="inline-flex items-center gap-1.5" dir={item.ltr ? 'ltr' : undefined}>
                                        <item.icon className="size-3.5 text-gold-300" />
                                        {item.value}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {!academy.archived && (
                        <div className="flex flex-wrap gap-2">
                            {can.impersonate && (
                                <Button
                                    variant="gold"
                                    onClick={() => actions.visit('post', route('academies.impersonate', academy.id))}
                                    loading={actions.processing}
                                    disabled={!manager}
                                >
                                    <LogIn className="rtl:rotate-180" />
                                    {t('Enter the academy')}
                                </Button>
                            )}
                            <LinkButton href={route('academies.edit', academy.id)} variant="light">
                                <Pencil />
                                {t('Edit')}
                            </LinkButton>
                            <a
                                href={route('site.academy', academy.slug)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/15 px-4 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur transition hover:bg-white/25"
                            >
                                <ExternalLink className="size-4" />
                                {t('Public page')}
                            </a>
                            {can.administer && (
                                <Dropdown
                                    trigger={
                                        <Button variant="light" size="icon" aria-label={t('Options')}>
                                            <EllipsisVertical />
                                        </Button>
                                    }
                                >
                                    {actions.items(academy, false)}
                                </Dropdown>
                            )}
                        </div>
                    )}
                </div>
            </section>

            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard icon={BookOpen} label={t('Halaqat')} value={formatNumber(academy.counts.halaqat ?? 0, locale)} tone="emerald" />
                <StatCard icon={GraduationCap} label={t('Teachers')} value={formatNumber(academy.counts.teachers ?? 0, locale)} tone="gold" />
                <StatCard icon={Users} label={t('Students')} value={formatNumber(academy.counts.students ?? 0, locale)} tone="sky" />
                <Link href={route('join-requests.index', { academy_id: academy.id })} className="block">
                    <StatCard
                        icon={UserPlus}
                        label={t('Join requests')}
                        value={formatNumber(academy.counts.pending_requests ?? 0, locale)}
                        hint={t('Waiting for an answer')}
                        tone="amber"
                        className="h-full transition hover:border-line-strong"
                    />
                </Link>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
                <div className="min-w-0 space-y-6 xl:col-span-2">
                    <Card>
                        <CardHeader
                            title={t('Halaqat')}
                            icon={BookOpen}
                            actions={
                                !academy.archived && (
                                    <LinkButton href={route('halaqat.create', { academy_id: academy.id })} size="sm" variant="outline">
                                        <Plus />
                                        {t('New halaqa')}
                                    </LinkButton>
                                )
                            }
                        />
                        <CardBody>
                            {halaqat.length === 0 ? (
                                <EmptyState icon={BookOpen} title={t('No halaqat yet')} compact />
                            ) : (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {halaqat.map((halaqa) => (
                                        <HalaqaCard key={halaqa.id} halaqa={halaqa} />
                                    ))}
                                </div>
                            )}
                        </CardBody>
                    </Card>

                    {academy.description && (
                        <Card>
                            <CardHeader title={t('About the academy')} />
                            <CardBody>
                                <p className="text-sm leading-loose whitespace-pre-line text-ink">{academy.description}</p>
                            </CardBody>
                        </Card>
                    )}
                </div>

                <div className="min-w-0 space-y-6">
                    <Card>
                        <CardHeader title={t('Manager')} />
                        <CardBody>
                            {manager ? (
                                <div className="flex items-center gap-3">
                                    <Avatar name={manager.name} src={manager.avatar_url} size="md" />
                                    <div className="min-w-0 flex-1">
                                        <Link href={route('users.show', manager.id)} className="block truncate font-semibold text-ink hover:text-primary-700">
                                            {manager.name}
                                        </Link>
                                        <p className="truncate text-xs text-muted" dir="ltr">
                                            {manager.email ?? manager.phone}
                                        </p>
                                    </div>
                                    {!manager.is_active && <Badge tone="rose">{t('Deactivated')}</Badge>}
                                </div>
                            ) : (
                                <EmptyState
                                    compact
                                    title={t('No manager yet')}
                                    description={t('Add the manager account from the edit page so the academy can be run.')}
                                />
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader
                            title={t('Teachers')}
                            icon={GraduationCap}
                            actions={
                                !academy.archived && (
                                    <LinkButton href={route('users.create', { role: 'teacher', academy_id: academy.id })} size="sm" variant="ghost">
                                        <Plus />
                                        {t('Add')}
                                    </LinkButton>
                                )
                            }
                        />
                        <CardBody className="space-y-3">
                            {teachers.length === 0 && <p className="text-sm text-muted">{t('No teachers yet')}</p>}
                            {teachers.map((teacher) => (
                                <Link key={teacher.id} href={route('users.show', teacher.id)} className="flex items-center gap-3 rounded-xl p-1 transition hover:bg-surface-muted">
                                    <Avatar name={teacher.name} src={teacher.avatar_url} size="sm" />
                                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{teacher.name}</span>
                                    <span className="text-xs text-muted">{t(':count halaqat', { count: teacher.teaching_halaqat_count ?? 0 })}</span>
                                </Link>
                            ))}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader
                            title={t('Latest students')}
                            icon={Users}
                            actions={
                                <>
                                    {!academy.archived && (
                                        <LinkButton href={route('users.create', { role: 'student', academy_id: academy.id })} size="sm" variant="ghost">
                                            <Plus />
                                            {t('Add')}
                                        </LinkButton>
                                    )}
                                    <LinkButton href={route('users.index', { role: 'student', academy_id: academy.id })} size="sm" variant="ghost">
                                        {t('View all')}
                                    </LinkButton>
                                </>
                            }
                        />
                        <CardBody className="space-y-3">
                            {recentStudents.length === 0 && <p className="text-sm text-muted">{t('No students yet')}</p>}
                            {recentStudents.map((student) => (
                                <Link key={student.id} href={route('users.show', student.id)} className="flex items-center gap-3 rounded-xl p-1 transition hover:bg-surface-muted">
                                    <Avatar name={student.name} src={student.avatar_url} size="sm" />
                                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{student.name}</span>
                                    {student.created_at && <span className="text-xs text-muted">{dates.relative(student.created_at)}</span>}
                                </Link>
                            ))}
                        </CardBody>
                    </Card>
                </div>
            </div>

            {actions.dialogs}
        </AppLayout>
    );
}
