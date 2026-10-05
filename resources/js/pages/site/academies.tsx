import { router } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import { AcademyCard } from '@/components/academy/academy-card';
import { PageHero } from '@/components/site/section';
import { LinkButton } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { Tabs } from '@/components/ui/tabs';
import PublicLayout from '@/layouts/public-layout';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { cleanQuery } from '@/lib/utils';
import type { AcademyItem, HalaqaGender, Paginated } from '@/types';

interface Filters {
    search: string;
    gender: HalaqaGender | null;
}

interface AcademiesProps {
    academies: Paginated<AcademyItem>;
    filters: Filters;
}

export default function Academies({ academies, filters }: AcademiesProps) {
    const { t } = useTrans();
    const labels = useLabels();

    const apply = (changes: Partial<Filters>) => {
        router.get(route('site.academies'), cleanQuery({ ...filters, ...changes }), { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <PublicLayout title={t('Academies')} description={t('Choose an academy, see its halaqat and times, and ask to join it.')}>
            <PageHero eyebrow={t('Academies')} title={t('Academies that welcome you')} description={t('Choose an academy, see its halaqat and times, and ask to join it.')}>
                <SearchInput
                    value={filters.search}
                    onSearch={(search) => apply({ search })}
                    placeholder={t('Name or place of the academy...')}
                    className="mx-auto max-w-md text-start"
                />
            </PageHero>

            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                <Tabs
                    className="mb-8 sm:flex sm:justify-center"
                    value={filters.gender ?? 'all'}
                    onChange={(gender) => apply({ gender: gender === 'all' ? null : (gender as HalaqaGender) })}
                    items={[
                        { value: 'all', label: t('All') },
                        { value: 'male', label: labels.halaqaGender.male },
                        { value: 'female', label: labels.halaqaGender.female },
                        { value: 'mixed', label: labels.halaqaGender.mixed },
                    ]}
                />

                {academies.data.length === 0 ? (
                    <EmptyState icon={Building2} title={t('No academies found')} />
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {academies.data.map((academy) => (
                            <AcademyCard
                                key={academy.id}
                                academy={academy}
                                href={route('site.academy', academy.slug)}
                                action={
                                    <LinkButton href={route('site.academy', academy.slug)} className="w-full">
                                        {t('View the academy')}
                                    </LinkButton>
                                }
                            />
                        ))}
                    </div>
                )}

                <Pagination data={academies} className="mt-10" />
            </div>
        </PublicLayout>
    );
}
