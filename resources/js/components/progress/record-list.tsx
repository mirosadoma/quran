import { Link, router } from '@inertiajs/react';
import { BookOpen, CalendarDays, CircleAlert, GraduationCap, Pencil, Repeat, Trash } from 'lucide-react';
import { useState } from 'react';
import { GradeBadge, ProgressTypeBadge } from '@/components/badges';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/modal';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { rangeLabel } from '@/lib/quran';
import { cn, colorOf } from '@/lib/utils';
import type { ProgressRecordItem } from '@/types';

interface RecordListProps {
    records: ProgressRecordItem[];
    showStudent?: boolean;
    showHalaqa?: boolean;
    onEdit?: (record: ProgressRecordItem) => void;
    emptyTitle?: string;
    emptyDescription?: string;
}

export function RecordList({ records, showStudent = false, showHalaqa = true, onEdit, emptyTitle, emptyDescription }: RecordListProps) {
    const { t, locale } = useTrans();
    const dates = useDates();
    const [deleting, setDeleting] = useState<ProgressRecordItem | null>(null);
    const [processing, setProcessing] = useState(false);

    // Memorization and revision saved together arrive as separate records: show them once.
    const recitations = records.filter(
        (record, index) => record.group_uuid === null || records.findIndex((item) => item.group_uuid === record.group_uuid) === index,
    );

    if (records.length === 0) {
        return <EmptyState icon={BookOpen} title={emptyTitle ?? t('No recitations yet')} description={emptyDescription} compact />;
    }

    const destroy = () => {
        if (!deleting) {
            return;
        }

        setProcessing(true);
        router.delete(route('progress.destroy', deleting.id), {
            preserveScroll: true,
            onFinish: () => {
                setProcessing(false);
                setDeleting(null);
            },
        });
    };

    return (
        <>
            <ul className="divide-y divide-line">
                {recitations.map((record) => {
                    const portions = record.portions.length > 0 ? record.portions : [record];
                    const memorization = portions.some((portion) => portion.type === 'memorization');

                    return (
                        <li key={record.id} className="flex gap-4 px-5 py-4 sm:px-6">
                            {showStudent && record.student ? (
                                <Avatar name={record.student.name} src={record.student.avatar_url} />
                            ) : (
                                <span
                                    className={cn(
                                        'flex size-10 shrink-0 items-center justify-center rounded-2xl',
                                        memorization ? 'bg-gold-50 text-gold-600 dark:bg-gold-500/10' : 'bg-sky-50 text-sky-600 dark:bg-sky-500/10',
                                    )}
                                >
                                    {memorization ? <BookOpen className="size-4.5" /> : <Repeat className="size-4.5" />}
                                </span>
                            )}

                            <div className="min-w-0 flex-1">
                                {showStudent && record.student && (
                                    <Link
                                        href={route('progress.student', record.student.id)}
                                        className="font-semibold text-ink hover:text-primary-700 dark:hover:text-primary-300"
                                    >
                                        {record.student.name}
                                    </Link>
                                )}
                                <div className={cn('space-y-3', showStudent && record.student && 'mt-1.5')}>
                                    {portions.map((portion) => (
                                        <div key={portion.id}>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <ProgressTypeBadge type={portion.type} />
                                                {portion.grade && <GradeBadge grade={portion.grade} />}
                                            </div>
                                            <p className="mt-1 font-quran text-lg leading-relaxed text-ink">{rangeLabel(portion, locale)}</p>
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                                                <span className="font-semibold text-primary-700 dark:text-primary-300">
                                                    {t(':count ayahs', { count: portion.ayahs_count })}
                                                </span>
                                                {portion.mistakes > 0 && (
                                                    <span className="inline-flex items-center gap-1">
                                                        <CircleAlert className="size-3.5" />
                                                        {t(':count mistakes', { count: portion.mistakes })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                                    <span className="inline-flex items-center gap-1">
                                        <CalendarDays className="size-3.5" />
                                        {dates.day(record.recorded_on)}
                                    </span>
                                    {record.teacher && (
                                        <span className="inline-flex items-center gap-1">
                                            <GraduationCap className="size-3.5" />
                                            {record.teacher.name}
                                        </span>
                                    )}
                                    {showHalaqa && record.halaqa && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <span className={cn('size-2 rounded-full', colorOf(record.halaqa.color).dot)} />
                                            {record.halaqa.name}
                                        </span>
                                    )}
                                </div>
                                {record.notes && (
                                    <p dir="auto" className="mt-2.5 rounded-xl border-s-2 border-gold-400 bg-surface-muted px-3 py-2 text-sm leading-relaxed text-ink/85">
                                        {record.notes}
                                    </p>
                                )}
                            </div>

                            {record.can_manage && (
                                <div className="flex shrink-0 items-start gap-1">
                                    {onEdit && (
                                        <Button variant="ghost" size="icon-sm" onClick={() => onEdit(record)} aria-label={t('Edit')}>
                                            <Pencil />
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="hover:text-rose-600"
                                        onClick={() => setDeleting(record)}
                                        aria-label={t('Delete')}
                                    >
                                        <Trash />
                                    </Button>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>

            <ConfirmDialog
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={destroy}
                processing={processing}
                title={t('Delete this record?')}
                message={t('The memorization total of the student will be recalculated.')}
                confirmLabel={t('Delete')}
            />
        </>
    );
}
