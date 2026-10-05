import { Link } from '@inertiajs/react';
import { Clock, UserRound, Users } from 'lucide-react';
import { AttendanceBadge, SessionStatusBadge } from '@/components/badges';
import { JoinSessionButton } from '@/components/session/join-button';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { cn, colorOf } from '@/lib/utils';
import type { SessionItem } from '@/types';

interface SessionRowProps {
    session: SessionItem;
    showHalaqa?: boolean;
    showTeacher?: boolean;
}

export function DateTile({ value, className }: { value: string; className?: string }) {
    const dates = useDates();

    return (
        <div className={cn('flex w-15 shrink-0 flex-col items-center rounded-2xl border border-line bg-surface-muted py-2 text-center', className)}>
            <span className="text-[11px] font-medium text-muted">{dates.date(value, { weekday: 'short', day: undefined, month: undefined, year: undefined })}</span>
            <span className="mt-0.5 text-xl font-bold leading-none text-ink tabular-nums">
                {dates.date(value, { day: 'numeric', month: undefined, year: undefined })}
            </span>
            <span className="mt-0.5 text-[11px] text-muted">{dates.date(value, { month: 'short', day: undefined, year: undefined })}</span>
        </div>
    );
}

export function SessionRow({ session, showHalaqa = true, showTeacher = true }: SessionRowProps) {
    const dates = useDates();
    const { t } = useTrans();
    const color = colorOf(session.halaqa?.color);

    return (
        <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 transition hover:bg-surface-muted/50 sm:px-6', session.status === 'cancelled' && 'opacity-70')}>
            <DateTile value={session.starts_at} />

            <div className="min-w-0 flex-1">
                <Link
                    href={route('sessions.show', session.id)}
                    className="block truncate font-semibold text-ink transition hover:text-primary-700 dark:hover:text-primary-300"
                >
                    {session.display_title}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {dates.time(session.starts_at)} – {dates.time(session.ends_at)}
                    </span>
                    {showHalaqa && session.halaqa && session.halaqa.name !== session.display_title && (
                        <span className="inline-flex items-center gap-1.5">
                            <span className={cn('size-2 rounded-full', color.dot)} />
                            {session.halaqa.name}
                        </span>
                    )}
                    {showTeacher && session.teacher && (
                        <span className="inline-flex items-center gap-1">
                            <UserRound className="size-3.5" />
                            {session.teacher.name}
                        </span>
                    )}
                    {session.present_count !== undefined && session.status === 'completed' && (
                        <span className="inline-flex items-center gap-1">
                            <Users className="size-3.5" />
                            {t(':count attended', { count: session.present_count })}
                        </span>
                    )}
                </div>
                {session.status === 'cancelled' && session.cancel_reason && (
                    <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{session.cancel_reason}</p>
                )}
            </div>

            <div className="flex items-center gap-2">
                {session.my_attendance && <AttendanceBadge status={session.my_attendance} />}
                <SessionStatusBadge status={session.status} />
                <JoinSessionButton session={session} size="sm" />
            </div>
        </div>
    );
}
