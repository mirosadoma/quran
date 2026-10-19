import { Link, usePage } from '@inertiajs/react';
import { AlarmClock, Award, BookOpen, BookOpenCheck, BookOpenText, CalendarDays, CirclePlay, HandHeart, Layers, Megaphone, Percent, Plus } from 'lucide-react';
import { useState } from 'react';
import { alarmIcons } from '@/components/alarms/alarm-form';
import { IslamicPattern } from '@/components/brand';
import { VerseCard, WelcomeBanner } from '@/components/dashboard/widgets';
import { ExamBanners } from '@/components/exams/exam-banners';
import { AnnouncementList } from '@/components/halaqa/announcements';
import { HalaqaCard } from '@/components/halaqa/halaqa-card';
import { PushPrompt } from '@/components/install-app';
import { JuzMap } from '@/components/progress/juz-map';
import { PendingSubmissions, SubmissionForm } from '@/components/progress/recitation-submissions';
import { RecordList } from '@/components/progress/record-list';
import { NextSessionPanel } from '@/components/session/next-session-panel';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/form';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatCard } from '@/components/ui/stat-card';
import { VideoCard, VideoPlayer } from '@/components/video/video-components';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { nextPosition, TOTAL_AYAHS } from '@/lib/quran';
import { formatNumber } from '@/lib/utils';
import type { AnnouncementItem, ExamDayItem, HalaqaItem, ProgressRecordItem, ProgressSummary, RecitationSubmissionItem, SessionItem, VideoItem } from '@/types';

interface StudentDashboardProps {
    nextSession: SessionItem | null;
    examDays: ExamDayItem[];
    /** Where the last memorization ended, to suggest the next portion. */
    lastPosition: { surah: number; ayah: number } | null;
    upcomingSessions: SessionItem[];
    summary: ProgressSummary;
    recentRecords: ProgressRecordItem[];
    halaqat: HalaqaItem[];
    videos: VideoItem[];
    announcements: AnnouncementItem[];
    mySubmissions: RecitationSubmissionItem[];
    mushafPage: number | null;
}

export default function StudentDashboard({ nextSession, examDays, lastPosition, upcomingSessions, summary, recentRecords, halaqat, videos, announcements, mySubmissions, mushafPage }: StudentDashboardProps) {
    const { t, locale } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const { auth, alarms } = usePage().props;
    const [playing, setPlaying] = useState<VideoItem | null>(null);
    const [submitFor, setSubmitFor] = useState<number | null>(null);
    const [halaqaChoice, setHalaqaChoice] = useState<number | ''>(halaqat[0]?.id ?? '');
    const coverage = summary.coverage;
    const activeHalaqat = halaqat.filter((halaqa) => halaqa.is_active);
    const submissionFor = (halaqaId: number) => mySubmissions.find((submission) => submission.halaqa_id === halaqaId) ?? null;

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
                <NextSessionPanel session={nextSession} reloadOnly={['nextSession', 'upcomingSessions']} />
            </WelcomeBanner>

            <PushPrompt />

            <ExamBanners days={examDays} className="mb-6" />

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

            {activeHalaqat.length > 0 && (
                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                    <Card className="lg:col-span-2">
                        <CardHeader
                            title={t('My next recitation')}
                            description={
                                mySubmissions.length > 0
                                    ? t('Waiting for your teacher to grade it.')
                                    : t('Enter what you will recite (memorization, revision or both) before your turn.')
                            }
                            icon={BookOpenCheck}
                            actions={
                                <div className="flex items-center gap-2">
                                    {activeHalaqat.length > 1 && (
                                        <Select value={halaqaChoice} onChange={(event) => setHalaqaChoice(Number(event.target.value))} className="h-9 w-44 text-xs" aria-label={t('Halaqa')}>
                                            {activeHalaqat.map((halaqa) => (
                                                <option key={halaqa.id} value={halaqa.id}>
                                                    {halaqa.name}
                                                </option>
                                            ))}
                                        </Select>
                                    )}
                                    <Button size="sm" onClick={() => setSubmitFor(halaqaChoice === '' ? null : halaqaChoice)} disabled={halaqaChoice === ''}>
                                        <Plus />
                                        {halaqaChoice !== '' && submissionFor(halaqaChoice) ? t('Edit my recitation') : t('Enter my recitation')}
                                    </Button>
                                </div>
                            }
                        />
                        {mySubmissions.length === 0 ? (
                            <p className="px-6 py-6 text-sm text-muted">{t('Nothing entered yet. Enter your next recitation so your teacher only adds the grade and the mistakes.')}</p>
                        ) : (
                            <PendingSubmissions submissions={mySubmissions} onEdit={(submission) => setSubmitFor(submission.halaqa_id)} />
                        )}
                    </Card>

                    <Card>
                        <CardHeader
                            title={t('My alarms')}
                            icon={AlarmClock}
                            actions={
                                <LinkButton href={route('alarms.index')} variant="ghost" size="sm">
                                    {alarms.length > 0 ? t('Manage') : t('Add an alarm')}
                                </LinkButton>
                            }
                        />
                        {alarms.length === 0 ? (
                            <p className="px-6 py-6 text-sm text-muted">{t('Set an alarm for your memorization and revision so you never miss them.')}</p>
                        ) : (
                            <ul className="divide-y divide-line">
                                {alarms.slice(0, 4).map((alarm) => {
                                    const Icon = alarmIcons[alarm.kind];

                                    return (
                                        <li key={alarm.id} className="flex items-center gap-3 px-5 py-2.5">
                                            <Icon className="size-4 shrink-0 text-primary-600" />
                                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{alarm.title}</span>
                                            <span dir="ltr" className="text-sm font-bold text-ink tabular-nums">
                                                {dates.clock(alarm.time)}
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Card>
                </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Link
                    href={route('mushaf.index')}
                    className="group relative flex items-center gap-4 overflow-hidden rounded-3xl bg-linear-to-br from-primary-700 to-primary-950 px-6 py-5 text-white shadow-lg transition hover:-translate-y-0.5"
                >
                    <IslamicPattern className="text-white/7" size={48} />
                    <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                        <BookOpenText className="size-6" />
                    </span>
                    <span className="relative min-w-0">
                        <span className="block text-lg font-bold">{t('The recited mushaf')}</span>
                        <span className="block text-sm text-white/75">
                            {mushafPage ? t('Continue reading from page :page', { page: mushafPage }) : t('Read, listen to the sheikhs and mark the ayahs')}
                        </span>
                    </span>
                </Link>
                <Link
                    href={route('adhkar.index')}
                    className="group relative flex items-center gap-4 overflow-hidden rounded-3xl bg-linear-to-br from-gold-500 to-gold-800 px-6 py-5 text-white shadow-lg transition hover:-translate-y-0.5"
                >
                    <IslamicPattern className="text-white/8" size={48} />
                    <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
                        <HandHeart className="size-6" />
                    </span>
                    <span className="relative min-w-0">
                        <span className="block text-lg font-bold">{t('Adhkar and duas')}</span>
                        <span className="block text-sm text-white/80">{t('Morning and evening adhkar, sleep, and duas from the Quran and the sunnah')}</span>
                    </span>
                </Link>
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
                    {announcements.length > 0 && (
                        <Card>
                            <CardHeader
                                title={t('Messages from your teacher')}
                                icon={Megaphone}
                                actions={
                                    announcements[0].halaqa && (
                                        <LinkButton href={route('halaqat.show', { halaqa: announcements[0].halaqa.id, tab: 'messages' })} variant="ghost" size="sm">
                                            {t('View all')}
                                        </LinkButton>
                                    )
                                }
                            />
                            <AnnouncementList announcements={announcements} showHalaqa={halaqat.length > 1} compact />
                        </Card>
                    )}
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

            {submitFor !== null && (
                <SubmissionForm
                    open
                    onClose={() => setSubmitFor(null)}
                    halaqaId={submitFor}
                    submission={submissionFor(submitFor)}
                    suggestion={lastPosition ? nextPosition(lastPosition) : null}
                    savedIn="mySubmissions"
                />
            )}
        </AppLayout>
    );
}
