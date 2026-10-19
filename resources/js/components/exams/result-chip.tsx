import { GradeBadge } from '@/components/badges';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ExamEntryItem } from '@/types';

/**
 * The result of a student: the grade, the score out of the exam's maximum and the percentage.
 */
export function ResultChip({ entry, maxScore, className }: { entry: Pick<ExamEntryItem, 'grade' | 'score' | 'percent' | 'is_graded'>; maxScore: number; className?: string }) {
    const { t } = useTrans();

    if (!entry.is_graded) {
        return <span className={cn('text-xs text-muted', className)}>{t('No result yet')}</span>;
    }

    if (entry.grade === null && entry.score === null) {
        // Graded but hidden from the viewer (a student before publishing).
        return <span className={cn('text-xs text-muted', className)}>{t('Result not sent yet')}</span>;
    }

    return (
        <span className={cn('inline-flex flex-wrap items-center gap-1.5', className)}>
            {entry.grade && <GradeBadge grade={entry.grade} />}
            {entry.score !== null && (
                <span dir="ltr" className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-bold text-ink tabular-nums ring-1 ring-line">
                    {entry.score} / {maxScore}
                    {entry.percent !== null && <span className="ms-1 text-muted">({entry.percent}%)</span>}
                </span>
            )}
        </span>
    );
}
