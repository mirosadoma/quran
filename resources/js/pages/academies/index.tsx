import { Link, router } from '@inertiajs/react';
import { Building2, EllipsisVertical, LogIn, Mail, Phone, Plus, UserPlus } from 'lucide-react';
import { AcademyStatusBadge, useAcademyActions } from '@/components/academy/academy-actions';
import { AcademyLogo } from '@/components/academy/academy-logo';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, LinkButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dropdown } from '@/components/ui/dropdown';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { Tabs } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { cleanQuery, formatNumber } from '@/lib/utils';
import type { AcademyItem, Paginated } from '@/types';

type Status = 'active' | 'inactive' | 'archived';

interface Filters {
    status: Status | null;
    search: string;
}

interface AcademiesIndexProps {
    academies: Paginated<AcademyItem>;
    filters: Filters;
    totals: Record<'all' | Status, number>;
}

export default function AcademiesIndex({ academies, filters, totals }: AcademiesIndexProps) {
    const { t, locale } = useTrans();
    const labels = useLabels();
    const actions = useAcademyActions();

    const apply = (changes: Partial<Filters>) => {
        router.get(route('academies.index'), cleanQuery({ ...filters, ...changes }), { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout
            title={t('Academies')}
            description={t('The academies of the platform, each with its manager, teachers, students and halaqat.')}
            actions={
                <LinkButton href={route('academies.create')}>
                    <Plus />
                    {t('Add an academy')}
                </LinkButton>
            }
        >
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
                <Tabs
                    value={filters.status ?? 'all'}
                    onChange={(status) => apply({ status: status === 'all' ? null : (status as Status) })}
                    items={[
                        { value: 'all', label: t('All'), count: totals.all },
                        { value: 'active', label: t('Active'), count: totals.active },
                        { value: 'inactive', label: t('Deactivated'), count: totals.inactive },
                        { value: 'archived', label: t('Archived'), count: totals.archived },
                    ]}
                />
                <SearchInput
                    value={filters.search}
                    onSearch={(search) => apply({ search })}
                    placeholder={t('Name or place of the academy...')}
                    className="lg:ms-auto lg:w-80"
                />
            </div>

            {academies.data.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={Building2}
                        title={filters.status === 'archived' ? t('No archived academies') : t('No academies found')}
                        description={t('Each academy has a manager who signs in with their own account and runs its teachers, students and halaqat.')}
                        action={
                            <LinkButton href={route('academies.create')}>
                                <Plus />
                                {t('Add an academy')}
                            </LinkButton>
                        }
                    />
                </Card>
            ) : (
                <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
                    {academies.data.map((academy) => (
                        <Card key={academy.id} className="flex flex-col overflow-hidden">
                            <div className="flex items-start gap-4 p-5">
                                <AcademyLogo academy={academy} size="md" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <Link
                                            href={route('academies.show', academy.id)}
                                            className="min-w-0 text-lg leading-snug font-bold text-ink transition hover:text-primary-700 dark:hover:text-primary-300"
                                        >
                                            {academy.name}
                                        </Link>
                                        <Dropdown
                                            trigger={
                                                <Button variant="ghost" size="icon-sm" aria-label={t('Options')} className="-me-2 -mt-1">
                                                    <EllipsisVertical />
                                                </Button>
                                            }
                                        >
                                            {actions.items(academy)}
                                        </Dropdown>
                                    </div>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                        <AcademyStatusBadge academy={academy} />
                                        <Badge tone="sky">{labels.halaqaGender[academy.gender]}</Badge>
                                        {!!academy.counts.pending_requests && (
                                            <Badge tone="amber">
                                                <UserPlus className="size-3" />
                                                {t('Join requests: :count', { count: academy.counts.pending_requests })}
                                            </Badge>
                                        )}
                                    </div>
                                    {academy.tagline && <p className="mt-2 line-clamp-2 text-sm text-muted">{academy.tagline}</p>}
                                </div>
                            </div>

                            <dl className="mx-5 mb-5 grid grid-cols-3 divide-x divide-line rounded-2xl bg-surface-muted py-2.5 text-center rtl:divide-x-reverse">
                                {[
                                    { label: t('Halaqat'), value: academy.counts.halaqat },
                                    { label: t('Teachers'), value: academy.counts.teachers },
                                    { label: t('Students'), value: academy.counts.students },
                                ].map((item) => (
                                    <div key={item.label}>
                                        <dt className="text-[11px] text-muted">{item.label}</dt>
                                        <dd className="mt-0.5 font-bold text-ink tabular-nums">{formatNumber(item.value ?? 0, locale)}</dd>
                                    </div>
                                ))}
                            </dl>

                            <div className="mt-auto flex items-center gap-3 border-t border-line p-4">
                                {academy.manager ? (
                                    <>
                                        <Avatar name={academy.manager.name} src={academy.manager.avatar_url} size="sm" />
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-ink">{academy.manager.name}</p>
                                            <p className="flex items-center gap-1 truncate text-xs text-muted" dir="ltr">
                                                {academy.manager.email ? <Mail className="size-3 shrink-0" /> : <Phone className="size-3 shrink-0" />}
                                                <span className="truncate">{academy.manager.email ?? academy.manager.phone}</span>
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <p className="flex-1 text-sm text-muted">{t('No manager yet')}</p>
                                )}
                                {!academy.archived && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => actions.visit('post', route('academies.impersonate', academy.id))}
                                        disabled={!academy.manager}
                                        title={t('Enter the academy with the account of its manager')}
                                    >
                                        <LogIn className="rtl:rotate-180" />
                                        {t('Enter')}
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            <Pagination data={academies} className="mt-8" />

            {actions.dialogs}
        </AppLayout>
    );
}
