import { Link } from '@inertiajs/react';
import { Building2, CalendarDays, ClipboardList, Users } from 'lucide-react';
import { IslamicPattern } from '@/components/brand';
import { ExamStateBadge } from '@/components/exams/exam-badges';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ExamItem } from '@/types';

export function ExamCard({ exam, showAcademy = false }: { exam: ExamItem; showAcademy?: boolean }) {
    const { t } = useTrans();
    const dates = useDates();
    const days = exam.days ?? [];
    const state = exam.state ?? 'draft';
    const students = days.reduce((total, day) => total + (day.summary?.students ?? 0), 0);

    return (
        <Link
            href={route('exams.show', exam.id)}
            className={cn(
                'group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-950/5',
                state === 'finished' && 'opacity-80',
            )}
        >
            <div className={cn('relative overflow-hidden bg-linear-to-br px-5 py-4 text-white', state === 'live' ? 'from-emerald-600 to-primary-900' : 'from-primary-700 to-primary-950')}>
                <IslamicPattern className="text-white/[0.12]" size={44} />
                <div className="relative flex items-start justify-between gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
                        <ClipboardList className="size-5" />
                    </span>
                    <ExamStateBadge state={state} />
                </div>
                <h3 className="relative mt-3 truncate text-lg font-bold">{exam.title}</h3>
                {showAcademy && exam.academy && (
                    <p className="relative mt-0.5 inline-flex items-center gap-1 text-xs text-white/75">
                        <Building2 className="size-3.5" />
                        {exam.academy.name}
                    </p>
                )}
            </div>

            <div className="flex flex-1 flex-col gap-3 p-5">
                {exam.description && <p className="line-clamp-2 text-sm leading-relaxed text-muted">{exam.description}</p>}
                <ul className="space-y-1.5 text-sm">
                    {days.slice(0, 3).map((day) => (
                        <li key={day.id} className="flex items-center gap-2 text-ink">
                            <CalendarDays className="size-4 shrink-0 text-primary-600" />
                            <span className="truncate">{dates.dateTime(day.starts_at)}</span>
                            {day.status === 'live' && <span className="ms-auto text-xs font-bold text-emerald-600">{t('Live now')}</span>}
                        </li>
                    ))}
                    {days.length > 3 && <li className="text-xs text-muted">{t('and :count more days', { count: days.length - 3 })}</li>}
                    {days.length === 0 && <li className="text-xs text-muted">{t('No days scheduled yet')}</li>}
                </ul>
                <p className="mt-auto flex items-center gap-1.5 text-xs text-muted">
                    <Users className="size-3.5" />
                    {t(':count students', { count: students })}
                    <span className="mx-1 text-line-strong">·</span>
                    {t('Score out of :max', { max: exam.max_score })}
                </p>
            </div>
        </Link>
    );
}
