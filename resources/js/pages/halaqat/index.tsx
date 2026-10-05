import { router, usePage } from '@inertiajs/react';
import { BookOpen, Plus } from 'lucide-react';
import { HalaqaCard } from '@/components/halaqa/halaqa-card';
import { LinkButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/form';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { Tabs } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import { cleanQuery } from '@/lib/utils';
import type { HalaqaItem, Paginated } from '@/types';

interface Filters {
    search: string;
    status: 'active' | 'archived' | 'all';
    teacher_id: number | null;
    academy_id: number | null;
}

interface HalaqatIndexProps {
    halaqat: Paginated<HalaqaItem>;
    filters: Filters;
    teachers: { id: number; name: string }[];
    academies: { id: number; name: string }[];
    can: { create: boolean };
}

export default function HalaqatIndex({ halaqat, filters, teachers, academies, can }: HalaqatIndexProps) {
    const { t } = useTrans();
    const { auth } = usePage().props;
    const isAdmin = auth.user?.role === 'admin';
    // The administration and the academy managers manage halaqat; teachers and students see theirs.
    const manages = isAdmin || auth.user?.role === 'manager';

    const apply = (changes: Partial<Filters>) => {
        router.get(route('halaqat.index'), cleanQuery({ ...filters, ...changes }), { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout
            title={manages ? t('Halaqat') : t('My halaqat')}
            description={manages ? t('Manage the halaqat, their teachers, schedules and students.') : t('The halaqat you belong to.')}
            actions={
                can.create && (
                    <LinkButton href={route('halaqat.create', cleanQuery({ academy_id: filters.academy_id }))}>
                        <Plus />
                        {t('New halaqa')}
                    </LinkButton>
                )
            }
        >
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
                <SearchInput value={filters.search} onSearch={(search) => apply({ search })} placeholder={t('Search halaqat...')} className="lg:w-80" />
                <Tabs
                    value={filters.status}
                    onChange={(status) => apply({ status })}
                    items={[
                        { value: 'active', label: t('Active') },
                        { value: 'archived', label: t('Archived') },
                        { value: 'all', label: t('All') },
                    ]}
                />
                <div className="flex flex-col gap-3 sm:flex-row lg:ms-auto">
                    {academies.length > 0 && (
                        <div className="sm:w-60">
                            <Select
                                value={filters.academy_id ?? ''}
                                onChange={(event) => apply({ academy_id: Number(event.target.value) || null, teacher_id: null })}
                                aria-label={t('Academy')}
                            >
                                <option value="">{t('All academies')}</option>
                                {academies.map((academy) => (
                                    <option key={academy.id} value={academy.id}>
                                        {academy.name}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}
                    {manages && teachers.length > 0 && (
                        <div className="sm:w-60">
                            <Select
                                value={filters.teacher_id ?? ''}
                                onChange={(event) => apply({ teacher_id: Number(event.target.value) || null })}
                                aria-label={t('Teacher')}
                            >
                                <option value="">{t('All teachers')}</option>
                                {teachers.map((teacher) => (
                                    <option key={teacher.id} value={teacher.id}>
                                        {teacher.name}
                                    </option>
                                ))}
                            </Select>
                        </div>
                    )}
                </div>
            </div>

            {halaqat.data.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={BookOpen}
                        title={t('No halaqat found')}
                        description={can.create ? t('Create the first halaqa and set its weekly schedule.') : t('You have not been added to a halaqa yet.')}
                        action={
                            can.create && (
                                <LinkButton href={route('halaqat.create')}>
                                    <Plus />
                                    {t('New halaqa')}
                                </LinkButton>
                            )
                        }
                    />
                </Card>
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {halaqat.data.map((halaqa) => (
                        <HalaqaCard key={halaqa.id} halaqa={halaqa} showAcademy={isAdmin} />
                    ))}
                </div>
            )}

            <Pagination data={halaqat} className="mt-8" />
        </AppLayout>
    );
}
