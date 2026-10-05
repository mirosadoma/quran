import { router } from '@inertiajs/react';
import { Award, BookOpen, BookOpenCheck, Plus, Repeat, X } from 'lucide-react';
import { useState } from 'react';
import { RecordForm } from '@/components/progress/record-form';
import { RecordList } from '@/components/progress/record-list';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/form';
import { Pagination } from '@/components/ui/pagination';
import { StatCard } from '@/components/ui/stat-card';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import { grades, useLabels } from '@/lib/labels';
import { cleanQuery, formatNumber } from '@/lib/utils';
import type { Grade, HalaqaRef, Paginated, ProgressRecordItem, ProgressType } from '@/types';

interface Filters {
    halaqa_id: number | null;
    student_id: number | null;
    type: ProgressType | null;
    grade: Grade | null;
    from: string | null;
    to: string | null;
}

interface ProgressIndexProps {
    records: Paginated<ProgressRecordItem>;
    filters: Filters;
    halaqat: HalaqaRef[];
    students: { id: number; name: string; halaqa_ids: number[] }[];
    stats: { memorized: number; revised: number; records: number; average_grade: Grade | null };
}

export default function ProgressIndex({ records, filters, halaqat, students, stats }: ProgressIndexProps) {
    const { t, locale } = useTrans();
    const labels = useLabels();
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<ProgressRecordItem | null>(null);

    const apply = (changes: Partial<Filters>) => {
        router.get(route('progress.index'), cleanQuery({ ...filters, ...changes }), { preserveState: true, preserveScroll: true, replace: true });
    };

    const hasFilters = Object.values(filters).some((value) => value !== null);

    return (
        <AppLayout
            title={t('Recitations')}
            description={t('Memorization and revision recorded for the students.')}
            actions={
                students.length > 0 && (
                    <Button onClick={() => setCreating(true)}>
                        <Plus />
                        {t('Record a recitation')}
                    </Button>
                )
            }
        >
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard icon={BookOpen} label={t('Memorized this month')} value={t(':count ayahs', { count: formatNumber(stats.memorized, locale) })} tone="gold" />
                <StatCard icon={Repeat} label={t('Revised this month')} value={t(':count ayahs', { count: formatNumber(stats.revised, locale) })} tone="sky" />
                <StatCard icon={BookOpenCheck} label={t('Recitations this month')} value={formatNumber(stats.records, locale)} tone="emerald" />
                <StatCard icon={Award} label={t('Average grade')} value={stats.average_grade ? labels.grade[stats.average_grade] : '—'} tone="violet" />
            </div>

            <div className="my-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                <Select value={filters.halaqa_id ?? ''} onChange={(event) => apply({ halaqa_id: Number(event.target.value) || null })}>
                    <option value="">{t('All halaqat')}</option>
                    {halaqat.map((halaqa) => (
                        <option key={halaqa.id} value={halaqa.id}>
                            {halaqa.name}
                        </option>
                    ))}
                </Select>
                <Select value={filters.student_id ?? ''} onChange={(event) => apply({ student_id: Number(event.target.value) || null })}>
                    <option value="">{t('All students')}</option>
                    {students.map((student) => (
                        <option key={student.id} value={student.id}>
                            {student.name}
                        </option>
                    ))}
                </Select>
                <Select value={filters.type ?? ''} onChange={(event) => apply({ type: (event.target.value || null) as ProgressType | null })}>
                    <option value="">{t('Memorization and revision')}</option>
                    <option value="memorization">{labels.progressType.memorization}</option>
                    <option value="revision">{labels.progressType.revision}</option>
                </Select>
                <Select value={filters.grade ?? ''} onChange={(event) => apply({ grade: (event.target.value || null) as Grade | null })}>
                    <option value="">{t('All grades')}</option>
                    {grades.map((grade) => (
                        <option key={grade} value={grade}>
                            {labels.grade[grade]}
                        </option>
                    ))}
                </Select>
                <Input type="date" value={filters.from ?? ''} onChange={(event) => apply({ from: event.target.value || null })} aria-label={t('From')} />
                <Input type="date" value={filters.to ?? ''} onChange={(event) => apply({ to: event.target.value || null })} aria-label={t('To')} />
            </div>

            {hasFilters && (
                <div className="-mt-3 mb-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => apply({ halaqa_id: null, student_id: null, type: null, grade: null, from: null, to: null })}
                    >
                        <X />
                        {t('Clear filters')}
                    </Button>
                </div>
            )}

            <Card className="overflow-hidden">
                <RecordList
                    records={records.data}
                    showStudent
                    onEdit={setEditing}
                    emptyTitle={hasFilters ? t('No recitations match the filters') : t('No recitations yet')}
                />
            </Card>

            <Pagination data={records} className="mt-6" />

            <RecordForm
                open={creating || editing !== null}
                onClose={() => {
                    setCreating(false);
                    setEditing(null);
                }}
                record={editing}
                students={students}
                halaqat={halaqat}
            />
        </AppLayout>
    );
}
