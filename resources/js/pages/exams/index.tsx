import { router, usePage } from '@inertiajs/react';
import { ClipboardList, Plus } from 'lucide-react';
import { ExamCard } from '@/components/exams/exam-card';
import { LinkButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Tabs } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import type { ExamItem, Paginated } from '@/types';

interface ExamsIndexProps {
    exams: Paginated<ExamItem>;
    filters: { filter: 'upcoming' | 'finished' | 'all' };
    can: { create: boolean };
}

/**
 * The exams of the academy: planned by its manager, run by its teachers, taken by its students.
 */
export default function ExamsIndex({ exams, filters, can }: ExamsIndexProps) {
    const { t } = useTrans();
    const { auth } = usePage().props;
    const isAdmin = auth.user?.role === 'admin';
    const isStudent = auth.user?.role === 'student';

    const apply = (filter: ExamsIndexProps['filters']['filter']) => {
        router.get(route('exams.index'), { filter }, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout
            title={isStudent ? t('My exams') : t('Exams')}
            description={
                can.create
                    ? t('Plan an exam on one or more days, choose its halaqat and examiners, and examine the students one by one in private rooms.')
                    : isStudent
                      ? t('Your upcoming exams and the results your academy sent you.')
                      : t('The exams you examine in, and the exams of your halaqat.')
            }
            actions={
                can.create && (
                    <LinkButton href={route('exams.create')}>
                        <Plus />
                        {t('New exam')}
                    </LinkButton>
                )
            }
        >
            <Tabs
                className="mb-6"
                value={filters.filter}
                onChange={apply}
                items={[
                    { value: 'upcoming', label: t('Upcoming and running') },
                    { value: 'finished', label: t('Finished') },
                    { value: 'all', label: t('All') },
                ]}
            />

            {exams.data.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={ClipboardList}
                        title={t('No exams here')}
                        description={can.create ? t('Plan the first exam of your academy.') : t('You will see your exams here once your academy plans one.')}
                        action={
                            can.create && (
                                <LinkButton href={route('exams.create')}>
                                    <Plus />
                                    {t('New exam')}
                                </LinkButton>
                            )
                        }
                    />
                </Card>
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {exams.data.map((exam) => (
                        <ExamCard key={exam.id} exam={exam} showAcademy={isAdmin} />
                    ))}
                </div>
            )}

            <Pagination data={exams} className="mt-8" />
        </AppLayout>
    );
}
