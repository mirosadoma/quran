import { StarOrnament } from '@/components/brand';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { CoverageItem } from '@/types';

const levels = [
    'bg-surface-muted text-muted ring-1 ring-line',
    'bg-primary-50 text-primary-800 ring-1 ring-primary-200 dark:bg-primary-500/10 dark:text-primary-200 dark:ring-primary-500/20',
    'bg-primary-200 text-primary-900 dark:bg-primary-500/25 dark:text-primary-100',
    'bg-primary-400 text-white dark:bg-primary-500/60',
    'bg-primary-600 text-white',
    'bg-primary-800 text-gold-100 ring-2 ring-gold-400/70 dark:bg-primary-700',
];

function levelOf(item: CoverageItem): number {
    const ratio = item.total > 0 ? item.covered / item.total : 0;

    if (ratio === 0) {
        return 0;
    }

    if (ratio >= 1) {
        return 5;
    }

    return ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : 4;
}

/**
 * The thirty ajza colored by how much of each is memorized.
 */
export function JuzMap({ juz, className }: { juz: CoverageItem[]; className?: string }) {
    const { t } = useTrans();

    return (
        <div className={className}>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-10">
                {juz.map((item) => {
                    const level = levelOf(item);
                    const percent = item.total > 0 ? Math.round((item.covered / item.total) * 100) : 0;

                    return (
                        <div
                            key={item.number}
                            title={t('Juz :number: :percent% memorized', { number: item.number, percent })}
                            className={cn(
                                'relative flex aspect-square flex-col items-center justify-center rounded-xl transition hover:scale-105',
                                levels[level],
                            )}
                        >
                            {level === 5 && <StarOrnament className="absolute end-1 top-1 size-2.5 text-gold-300" />}
                            <span className="text-sm font-bold tabular-nums">{item.number}</span>
                            {level > 0 && level < 5 && <span className="text-[9px] font-semibold opacity-80">{percent}%</span>}
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
                <span className="inline-flex items-center gap-1.5">
                    <span className={cn('size-3 rounded', levels[0])} />
                    {t('Not started')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className={cn('size-3 rounded', levels[2])} />
                    {t('In progress')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className={cn('size-3 rounded', levels[4])} />
                    {t('Almost complete')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className={cn('size-3 rounded', levels[5])} />
                    {t('Completed')}
                </span>
            </div>
        </div>
    );
}
