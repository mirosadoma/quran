import { Link } from '@inertiajs/react';
import { ClipboardList, DoorOpen, Radio } from 'lucide-react';
import { Countdown } from '@/components/session/countdown';
import { LinkButton } from '@/components/ui/button';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ExamDayItem } from '@/types';

/**
 * The exam days running now or coming soon, at the top of the dashboards.
 */
export function ExamBanners({ days, className }: { days: ExamDayItem[]; className?: string }) {
    const { t } = useTrans();
    const dates = useDates();

    if (days.length === 0) {
        return null;
    }

    return (
        <div className={cn('space-y-3', className)}>
            {days.map((day) => {
                const live = day.status === 'live';
                const title = day.exam?.title ?? t('Exam');

                return (
                    <div
                        key={day.id}
                        className={cn(
                            'relative flex flex-wrap items-center gap-x-4 gap-y-3 overflow-hidden rounded-2xl border px-5 py-4',
                            live
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-50'
                                : 'border-gold-300 bg-gold-50 text-gold-950 dark:border-gold-500/30 dark:bg-gold-500/10 dark:text-gold-50',
                        )}
                    >
                        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', live ? 'bg-emerald-600 text-white' : 'bg-gold-500 text-white')}>
                            {live ? <Radio className="size-5 animate-pulse" /> : <ClipboardList className="size-5" />}
                        </span>
                        <div className="min-w-0 flex-1">
                            <Link href={route('exams.show', day.exam_id)} className="block truncate font-bold hover:underline">
                                {live ? t('Exam running now: :title', { title }) : t('Upcoming exam: :title', { title })}
                            </Link>
                            <p className="mt-0.5 text-sm opacity-80">
                                {dates.dateTime(day.starts_at)}
                                {day.my_entry?.examiner && (
                                    <>
                                        <span className="mx-1.5">·</span>
                                        {t('Your examiner: :name', { name: day.my_entry.examiner.name })}
                                    </>
                                )}
                                {day.my_entry && day.my_entry.position > 0 && (
                                    <>
                                        <span className="mx-1.5">·</span>
                                        {t('You are number :position in the queue', { position: day.my_entry.position })}
                                    </>
                                )}
                            </p>
                        </div>
                        {!live &&
                            (new Date(day.starts_at).getTime() > Date.now() ? (
                                <Countdown target={day.starts_at} />
                            ) : (
                                <span className="text-xs font-semibold opacity-80">{t('Waiting for the manager to open it')}</span>
                            ))}
                        {day.can_enter ? (
                            <LinkButton href={route('exams.room', day.id)} variant={live ? 'success' : 'gold'} size="lg">
                                <DoorOpen />
                                {live ? t('Enter the exam now') : t('Enter early')}
                            </LinkButton>
                        ) : (
                            <LinkButton href={route('exams.show', day.exam_id)} variant="secondary" size="sm">
                                {t('Details')}
                            </LinkButton>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
