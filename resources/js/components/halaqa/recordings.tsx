import { Link } from '@inertiajs/react';
import { Clock, FileVideo, UserRound } from 'lucide-react';
import { RecordingPlayer } from '@/components/session/recording-player';
import { DateTile } from '@/components/session/session-row';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import type { SessionItem } from '@/types';

/**
 * The recordings of the halaqa, session after session in order, played inside the platform.
 */
export function HalaqaRecordings({ sessions, canManage }: { sessions: SessionItem[]; canManage: boolean }) {
    const { t } = useTrans();
    const dates = useDates();

    return (
        <Card>
            <CardHeader
                title={t('Halaqa recordings')}
                description={canManage ? t('Upload the video of every session from its page; students watch it here in order.') : t('The recordings of the sessions, in order. Watch any of them whenever you want.')}
                icon={FileVideo}
            />
            {sessions.length === 0 ? (
                <EmptyState icon={FileVideo} title={t('No recordings yet')} description={canManage ? t('Open a past session and upload its video or paste its recording link.') : undefined} compact />
            ) : (
                <ol className="divide-y divide-line">
                    {sessions.map((session, index) => (
                        <li key={session.id} className="grid gap-4 px-5 py-5 sm:px-6 lg:grid-cols-5">
                            <div className="flex items-start gap-3 lg:col-span-2">
                                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">{index + 1}</span>
                                <DateTile value={session.starts_at} />
                                <div className="min-w-0">
                                    <Link href={route('sessions.show', session.id)} className="block font-semibold text-ink hover:text-primary-700 dark:hover:text-primary-300">
                                        {session.display_title}
                                    </Link>
                                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                                        <span className="inline-flex items-center gap-1">
                                            <Clock className="size-3.5" />
                                            {dates.dateTime(session.starts_at)}
                                        </span>
                                        {session.teacher && (
                                            <span className="inline-flex items-center gap-1">
                                                <UserRound className="size-3.5" />
                                                {session.teacher.name}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <div className="lg:col-span-3">
                                <RecordingPlayer session={session} compact />
                            </div>
                        </li>
                    ))}
                </ol>
            )}
        </Card>
    );
}
