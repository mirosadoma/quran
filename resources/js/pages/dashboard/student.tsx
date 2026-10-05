import { Link, router, usePage } from '@inertiajs/react';
import { Award, BookOpen, BookOpenCheck, CalendarDays, CirclePlay, Layers, Percent } from 'lucide-react';
import { useState } from 'react';
import { VerseCard, WelcomeBanner } from '@/components/dashboard/widgets';
import { HalaqaCard } from '@/components/halaqa/halaqa-card';
import { JuzMap } from '@/components/progress/juz-map';
import { RecordList } from '@/components/progress/record-list';
import { Countdown } from '@/components/session/countdown';
import { JoinSessionButton } from '@/components/session/join-button';
import { LinkButton } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatCard } from '@/components/ui/stat-card';
import { VideoCard, VideoPlayer } from '@/components/video/video-components';
import { useRealtime } from '@/hooks/use-realtime';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { TOTAL_AYAHS } from '@/lib/quran';
import { formatNumber } from '@/lib/utils';
import type { HalaqaItem, ProgressRecordItem, ProgressSummary, SessionItem, VideoItem } from '@/types';

interface StudentDashboardProps {
    nextSession: SessionItem | null;
    upcomingSessions: SessionItem[];
    summary: ProgressSummary;
    recentRecords: ProgressRecordItem[];
    halaqat: HalaqaItem[];
    videos: VideoItem[];
}

export default function StudentDashboard({ nextSession, upcomingSessions, summary, recentRecords, halaqat, videos }: StudentDashboardProps) {
    const { t, locale } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const { auth } = usePage().props;
    const [playing, setPlaying] = useState<VideoItem | null>(null);
    const coverage = summary.coverage;

    useRealtime('session', () => router.reload());

    return (
        <AppLayout title={t('Dashboard')} hideHeader>
            <WelcomeBanner
                title={t('Peace be upon you, :name', { name: auth.user?.name ?? '' })}
                subtitle={
                    nextSession
                        ? nextSession.status === 'live'
                            ? t('Your session :title has started. Join now!', { title: nextSession.display_title })
                            : t('Your next session: :title', { title: nextSession.display_title })
                        : t('May Allah make the Quran the spring of your heart.')
                }
            >
                {nextSession && (
                    <div className="flex flex-col items-start gap-3 sm:items-end">
                        {nextSession.status !== 'live' && (
                            <>
                                <p className="text-xs text-sidebar-ink/70">{dates.dateTime(nextSession.starts_at)}</p>
                                <Countdown target={nextSession.starts_at} light />
                            </>
                        )}
                        {nextSession.can_join ? (
                            <JoinSessionButton session={nextSession} size="lg" />
                        ) : (
                            <p className="rounded-xl bg-white/10 px-3 py-2 text-xs text-sidebar-ink/80">
                                {t('The join button appears 15 minutes before the session.')}
                            </p>
                        )}
                    </div>
                )}
            </WelcomeBanner>

            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                    icon={BookOpenCheck}
                    label={t('Ayahs memorized')}
                    value={formatNumber(coverage.ayahs, locale)}
                    hint={t(':percent% of the Quran', { percent: coverage.percent })}
                    tone="emerald"
                />
                <StatCard
                    icon={Layers}
                    label={t('Completed ajza')}
                    value={`${coverage.completed_juz} / 30`}
                    hint={t(':count surahs completed', { count: coverage.completed_surahs })}
                    tone="gold"
                />
                <StatCard
                    icon={Percent}
                    label={t('Attendance rate')}
                    value={summary.attendance.rate === null ? '—' : `${summary.attendance.rate}%`}
                    hint={t(':count sessions attended', { count: summary.attendance.present + summary.attendance.late })}
                    tone="sky"
                />
                <StatCard
                    icon={Award}
                    label={t('Average grade')}
                    value={summary.average_grade ? labels.grade[summary.average_grade] : '—'}
                    hint={t('Memorized this month: :count ayahs', { count: summary.memorized_this_month })}
                    tone="violet"
                />
            </div>

            <Card className="mt-6">
                <CardHeader
                    title={t('My memorization map')}
                    description={t(':count of :total ayahs', { count: formatNumber(coverage.ayahs, locale), total: formatNumber(TOTAL_AYAHS, locale) })}
                    icon={BookOpen}
                    actions={
                        <LinkButton href={route('progress.student', auth.user?.id ?? 0)} variant="secondary" size="sm">
                            {t('My progress')}
                        </LinkButton>
                    }
                />
                <CardBody>
                    <ProgressBar value={coverage.ayahs} max={TOTAL_AYAHS} className="mb-6" />
                    <JuzMap juz={coverage.juz} />
                </CardBody>
            </Card>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title={t('Teacher feedback')} icon={BookOpenCheck} />
                    <RecordList records={recentRecords} emptyDescription={t('Your recitations and the notes of your teacher will appear here.')} />
                </Card>
                <div className="space-y-6">
                    <Card>
                        <CardHeader title={t('Upcoming sessions')} icon={CalendarDays} />
                        {upcomingSessions.length === 0 ? (
                            <p className="px-6 py-6 text-center text-sm text-muted">{t('No other sessions scheduled.')}</p>
                        ) : (
                            <ul className="divide-y divide-line">
                                {upcomingSessions.map((session) => (
                                    <li key={session.id}>
                                        <Link href={route('sessions.show', session.id)} className="block px-5 py-3 hover:bg-surface-muted/60">
                                            <span className="block truncate text-sm font-semibold text-ink">{session.display_title}</span>
                                            <span className="text-xs text-muted">{dates.dateTime(session.starts_at)}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
                    <VerseCard />
                </div>
            </div>

            {halaqat.length > 0 && (
                <div className="mt-8">
                    <h2 className="mb-4 text-lg font-bold text-ink">{t('My halaqat')}</h2>
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {halaqat.map((halaqa) => (
                            <HalaqaCard key={halaqa.id} halaqa={halaqa} />
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-ink">{t('Latest videos')}</h2>
                    <LinkButton href={route('videos.index')} variant="ghost" size="sm">
                        {t('View all')}
                    </LinkButton>
                </div>
                {videos.length === 0 ? (
                    <Card>
                        <EmptyState icon={CirclePlay} title={t('No videos yet')} compact />
                    </Card>
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                        {videos.map((video) => (
                            <VideoCard key={video.id} video={video} onPlay={() => setPlaying(video)} />
                        ))}
                    </div>
                )}
            </div>


            <VideoPlayer video={playing} onClose={() => setPlaying(null)} />
        </AppLayout>
    );
}
