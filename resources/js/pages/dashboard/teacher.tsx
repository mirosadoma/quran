import { Link, router, usePage } from '@inertiajs/react';
import { BookOpen, BookOpenCheck, CalendarDays, ClipboardCheck, GraduationCap, Percent, TriangleAlert, UserX } from 'lucide-react';
import { MemorizationTrendChart } from '@/components/charts';
import { TopStudentsCard, VerseCard, WelcomeBanner } from '@/components/dashboard/widgets';
import { HalaqaCard } from '@/components/halaqa/halaqa-card';
import { PushPrompt } from '@/components/install-app';
import { PendingSubmissionsCard } from '@/components/progress/recitation-submissions';
import { RecordList } from '@/components/progress/record-list';
import { Countdown } from '@/components/session/countdown';
import { JoinSessionButton } from '@/components/session/join-button';
import { SessionRow } from '@/components/session/session-row';
import { Avatar } from '@/components/ui/avatar';
import { LinkButton } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import { useRealtime } from '@/hooks/use-realtime';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { formatNumber } from '@/lib/utils';
import type { HalaqaItem, ProgressRecordItem, RecitationSubmissionItem, SessionItem, WeeklyMemorization } from '@/types';

interface TeacherDashboardProps {
    stats: { halaqat: number; students: number; sessions_week: number; attendance_rate: number | null; records_month: number };
    upcomingSessions: SessionItem[];
    pendingAttendance: SessionItem[];
    halaqat: HalaqaItem[];
    recentRecords: ProgressRecordItem[];
    attentionStudents: { id: number; name: string; avatar_url: string | null; absences: number }[];
    memorizationTrend: WeeklyMemorization[];
    topStudents: { id: number; name: string; avatar_url: string | null; ayahs: number; total: number }[];
    pendingSubmissions: RecitationSubmissionItem[];
}

export default function TeacherDashboard(props: TeacherDashboardProps) {
    const { stats, upcomingSessions, pendingAttendance, halaqat, recentRecords, attentionStudents, memorizationTrend, topStudents, pendingSubmissions } = props;
    const { t, locale } = useTrans();
    const dates = useDates();
    const { auth } = usePage().props;
    const next = upcomingSessions[0];

    useRealtime('session', () => router.reload());

    return (
        <AppLayout title={t('Dashboard')} hideHeader>
            <WelcomeBanner
                title={t('Peace be upon you, :name', { name: auth.user?.name ?? '' })}
                subtitle={next ? t('Your next session: :title', { title: next.display_title }) : t('You have no upcoming sessions.')}
            >
                {next && (
                    <div className="flex flex-col items-start gap-3 sm:items-end">
                        {next.status === 'live' ? (
                            <p className="text-sm font-semibold text-emerald-300">{t('The session is live now')}</p>
                        ) : (
                            <>
                                <p className="text-xs text-sidebar-ink/70">{dates.dateTime(next.starts_at)}</p>
                                <Countdown target={next.starts_at} light />
                            </>
                        )}
                        <JoinSessionButton session={next} />
                    </div>
                )}
            </WelcomeBanner>

            <PushPrompt />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
                <StatCard icon={BookOpen} label={t('My halaqat')} value={formatNumber(stats.halaqat, locale)} tone="emerald" />
                <StatCard icon={GraduationCap} label={t('Students')} value={formatNumber(stats.students, locale)} tone="gold" />
                <StatCard icon={CalendarDays} label={t('Sessions in 7 days')} value={formatNumber(stats.sessions_week, locale)} tone="sky" />
                <StatCard
                    icon={Percent}
                    label={t('Attendance rate')}
                    value={stats.attendance_rate === null ? '—' : `${stats.attendance_rate}%`}
                    hint={t('Last 30 days')}
                    tone="teal"
                />
                <StatCard icon={BookOpenCheck} label={t('Recitations this month')} value={formatNumber(stats.records_month, locale)} tone="violet" />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader
                        title={t('Upcoming sessions')}
                        icon={CalendarDays}
                        actions={
                            <LinkButton href={route('sessions.index')} variant="ghost" size="sm">
                                {t('View all')}
                            </LinkButton>
                        }
                    />
                    {upcomingSessions.length === 0 ? (
                        <EmptyState icon={CalendarDays} title={t('No upcoming sessions')} compact />
                    ) : (
                        <div className="divide-y divide-line">
                            {upcomingSessions.map((session) => (
                                <SessionRow key={session.id} session={session} showTeacher={false} />
                            ))}
                        </div>
                    )}
                </Card>

                <div className="space-y-6">
                    <PendingSubmissionsCard submissions={pendingSubmissions} />

                    {pendingAttendance.length > 0 && (
                        <Card className="border-amber-200 dark:border-amber-500/20">
                            <CardHeader title={t('Attendance not recorded')} icon={ClipboardCheck} description={t('Completed sessions without attendance')} />
                            <ul className="divide-y divide-line">
                                {pendingAttendance.map((session) => (
                                    <li key={session.id}>
                                        <Link href={route('sessions.show', session.id)} className="flex items-center justify-between gap-3 px-5 py-3 text-sm hover:bg-surface-muted/60">
                                            <span className="min-w-0">
                                                <span className="block truncate font-semibold text-ink">{session.display_title}</span>
                                                <span className="text-xs text-muted">{dates.dateTime(session.starts_at)}</span>
                                            </span>
                                            <TriangleAlert className="size-4 shrink-0 text-amber-500" />
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    <Card>
                        <CardHeader title={t('Students needing attention')} description={t('Absent twice or more in 14 days')} icon={UserX} />
                        {attentionStudents.length === 0 ? (
                            <p className="px-6 py-6 text-center text-sm text-muted">{t('All students are attending regularly. Alhamdulillah!')}</p>
                        ) : (
                            <ul className="divide-y divide-line">
                                {attentionStudents.map((student) => (
                                    <li key={student.id}>
                                        <Link href={route('progress.student', student.id)} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-muted/60">
                                            <Avatar name={student.name} src={student.avatar_url} size="sm" />
                                            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{student.name}</span>
                                            <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                                                {t(':count absences', { count: student.absences })}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Card>
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

            <div className="mt-8 grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader title={t('Memorization and revision (ayahs)')} description={t('Last 8 weeks')} icon={BookOpenCheck} />
                    <MemorizationTrendChart data={memorizationTrend} className="p-5 sm:p-6" />
                </Card>
                <TopStudentsCard students={topStudents} />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader
                        title={t('Latest recitations')}
                        icon={BookOpenCheck}
                        actions={
                            <LinkButton href={route('progress.index')} variant="ghost" size="sm">
                                {t('View all')}
                            </LinkButton>
                        }
                    />
                    <RecordList records={recentRecords} showStudent showHalaqa={halaqat.length > 1} />
                </Card>
                <VerseCard className="self-start" />
            </div>
        </AppLayout>
    );
}
