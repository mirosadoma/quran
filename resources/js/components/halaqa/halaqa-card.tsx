import { Link } from '@inertiajs/react';
import { Archive, Building2, CalendarDays, Users } from 'lucide-react';
import { IslamicPattern } from '@/components/brand';
import { ScheduleChips } from '@/components/halaqa/schedule-chips';
import { Avatar } from '@/components/ui/avatar';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { cn, colorOf } from '@/lib/utils';
import type { HalaqaItem } from '@/types';

export function HalaqaCard({ halaqa, showAcademy = false }: { halaqa: HalaqaItem; showAcademy?: boolean }) {
    const { t } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const color = colorOf(halaqa.color);
    const students = halaqa.students_count ?? 0;

    return (
        <Link
            href={route('halaqat.show', halaqa.id)}
            className={cn(
                'group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-950/5',
                !halaqa.is_active && 'opacity-75',
            )}
        >
            <div className={cn('relative h-24 overflow-hidden bg-linear-to-br px-5 pt-4', color.gradient)}>
                <IslamicPattern className="text-white/[0.12]" size={44} />
                <div className="relative flex flex-wrap gap-1.5">
                    {halaqa.level && (
                        <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur">
                            {labels.level[halaqa.level]}
                        </span>
                    )}
                    <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white ring-1 ring-white/20 backdrop-blur">
                        {labels.halaqaGender[halaqa.gender]}
                    </span>
                    {!halaqa.is_active && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5 text-xs font-semibold text-white">
                            <Archive className="size-3" />
                            {t('Archived')}
                        </span>
                    )}
                </div>
            </div>

            <div className="relative flex flex-1 flex-col gap-4 p-5 pt-0">
                <div className="-mt-6 flex items-end gap-3">
                    {halaqa.teacher ? (
                        <Avatar name={halaqa.teacher.name} src={halaqa.teacher.avatar_url} size="lg" className="ring-4" />
                    ) : (
                        <span className="flex size-14 items-center justify-center rounded-full bg-surface-muted text-muted ring-4 ring-surface">
                            <Users className="size-6" />
                        </span>
                    )}
                    <p className="mb-1 truncate text-xs text-muted">{halaqa.teacher?.name ?? t('No teacher assigned')}</p>
                </div>

                <div>
                    <h3 className="text-lg font-bold leading-snug text-ink transition group-hover:text-primary-700 dark:group-hover:text-primary-300">
                        {halaqa.name}
                    </h3>
                    {showAcademy && halaqa.academy && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted">
                            <Building2 className="size-3.5 shrink-0" />
                            <span className="truncate">{halaqa.academy.name}</span>
                        </p>
                    )}
                </div>

                <ScheduleChips schedule={halaqa.schedule} compact />

                <div className="mt-auto space-y-3 border-t border-line pt-4">
                    <div>
                        <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="inline-flex items-center gap-1 text-muted">
                                <Users className="size-3.5" />
                                {t('Students')}
                            </span>
                            <span className="font-semibold text-ink tabular-nums">
                                {students}
                                {halaqa.capacity ? ` / ${halaqa.capacity}` : ''}
                            </span>
                        </div>
                        {halaqa.capacity ? <ProgressBar value={students} max={halaqa.capacity} size="sm" barClassName={color.bar} /> : null}
                    </div>
                    <p className="flex items-center gap-1.5 text-xs text-muted">
                        <CalendarDays className="size-3.5" />
                        {halaqa.next_session ? (
                            <>
                                {t('Next session')}:
                                <span className="font-semibold text-ink">{dates.dateTime(halaqa.next_session.starts_at)}</span>
                            </>
                        ) : (
                            t('No upcoming sessions')
                        )}
                    </p>
                </div>
            </div>
        </Link>
    );
}
