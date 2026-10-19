import { router, usePage, usePoll } from '@inertiajs/react';
import { CalendarCheck, Radio } from 'lucide-react';
import { Countdown } from '@/components/session/countdown';
import { JoinSessionButton } from '@/components/session/join-button';
import { useCountdown } from '@/hooks/use-countdown';
import { useRealtime } from '@/hooks/use-realtime';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import type { SessionItem } from '@/types';

interface NextSessionPanelProps {
    session: SessionItem | null;
    /** The page props refreshed when the session starts (the dashboards). */
    reloadOnly: string[];
}

/**
 * The next session in the welcome banner: a countdown until it starts, then the button to
 * join it the moment it goes live (the page refreshes itself without the user doing anything).
 */
export function NextSessionPanel({ session, reloadOnly }: NextSessionPanelProps) {
    const { t } = useTrans();
    const dates = useDates();
    const { realtime } = usePage().props;
    const countdown = useCountdown(session?.starts_at);
    const today = session !== null && (dates.isToday(session.starts_at) || session.status === 'live');

    useRealtime('session', () => router.reload({ only: reloadOnly }));

    // Without realtime: refresh around the start time so the join button appears by itself.
    usePoll(30_000, { only: reloadOnly }, { autoStart: today && !realtime.enabled && session?.status !== 'live' && countdown.totalSeconds < 2 * 3600 });

    if (!session) {
        return null;
    }

    const live = session.status === 'live';

    return (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur sm:items-end">
            <p className="flex items-center gap-2 text-xs font-semibold text-gold-200">
                {live ? <Radio className="size-4 animate-pulse text-emerald-300" /> : <CalendarCheck className="size-4" />}
                {live ? t('The session is live now') : today ? t("Today's session") : t('Next session')}
            </p>
            <p className="max-w-xs truncate text-base font-bold text-white">{session.display_title}</p>
            {!live && (
                <>
                    <p className="text-xs text-sidebar-ink/70">{today ? t('At :time', { time: dates.time(session.starts_at) }) : dates.dateTime(session.starts_at)}</p>
                    {!countdown.done && <Countdown target={session.starts_at} light />}
                </>
            )}
            {session.can_join ? (
                <JoinSessionButton session={session} size="lg" />
            ) : (
                today && <p className="rounded-xl bg-white/10 px-3 py-2 text-xs text-sidebar-ink/80">{t('The join button appears when the session is about to start.')}</p>
            )}
        </div>
    );
}
