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
}

interface HalaqatIndexProps {
    halaqat: Paginated<HalaqaItem>;
    filters: Filters;
    teachers: { id: number; name: string }[];
    can: { create: boolean };
}

export default function HalaqatIndex({ halaqat, filters, teachers, can }: HalaqatIndexProps) {
    const { t } = useTrans();
    const { auth } = usePage().props;
    const isAdmin = auth.user?.role === 'admin';

    const apply = (changes: Partial<Filters>) => {
        router.get(route('halaqat.index'), cleanQuery({ ...filters, ...changes }), { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout
            title={isAdmin ? t('Halaqat') : t('My halaqat')}
            description={isAdmin ? t('Manage the halaqat, their teachers, schedules and students.') : t('The halaqat you belong to.')}
            actions={
                can.create && (
                    <LinkButton href={route('halaqat.create')}>
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
                {isAdmin && teachers.length > 0 && (
                    <div className="lg:ms-auto lg:w-64">
                        <Select value={filters.teacher_id ?? ''} onChange={(event) => apply({ teacher_id: Number(event.target.value) || null })}>
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
                        <HalaqaCard key={halaqa.id} halaqa={halaqa} />
                    ))}
                </div>
            )}

            <Pagination data={halaqat} className="mt-8" />
        </AppLayout>
    );
}
