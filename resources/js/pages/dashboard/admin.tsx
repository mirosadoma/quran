import { usePage } from '@inertiajs/react';
import { BookOpen, BookOpenCheck, CalendarDays, CalendarPlus, ChartColumn, GraduationCap, Percent, Plus, UserPlus, Users } from 'lucide-react';
import { AttendanceTrendChart, MemorizationTrendChart } from '@/components/charts';
import { TopStudentsCard, WelcomeBanner } from '@/components/dashboard/widgets';
import { PushPrompt } from '@/components/install-app';
import { PendingSubmissionsCard } from '@/components/progress/recitation-submissions';
import { RecordList } from '@/components/progress/record-list';
import { SessionRow } from '@/components/session/session-row';
import { LinkButton } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { StatCard } from '@/components/ui/stat-card';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import { formatNumber } from '@/lib/utils';
import type { ProgressRecordItem, RecitationSubmissionItem, SessionItem, WeeklyAttendance, WeeklyMemorization } from '@/types';

interface AdminDashboardProps {
    stats: {
        students: number;
        teachers: number;
        halaqat: number;
        sessions_week: number;
        attendance_rate: number | null;
        memorized_month: number;
    };
    attendanceTrend: WeeklyAttendance[];
    memorizationTrend: WeeklyMemorization[];
    todaySessions: SessionItem[];
    recentRecords: ProgressRecordItem[];
    topStudents: { id: number; name: string; avatar_url: string | null; ayahs: number; total: number }[];
    pendingSubmissions: RecitationSubmissionItem[];
}

export default function AdminDashboard({ stats, attendanceTrend, memorizationTrend, todaySessions, recentRecords, topStudents, pendingSubmissions }: AdminDashboardProps) {
    const { t, locale } = useTrans();
    const { auth } = usePage().props;

    return (
        <AppLayout title={t('Dashboard')} hideHeader>
            <WelcomeBanner
                title={t('Peace be upon you, :name', { name: auth.user?.name.split(' ')[0] ?? '' })}
                subtitle={t('Here is an overview of the academy today: sessions, attendance and memorization progress.')}
            >
                <div className="flex flex-wrap gap-2">
                    <LinkButton href={route('halaqat.create')} variant="gold">
                        <Plus />
                        {t('New halaqa')}
                    </LinkButton>
                    <LinkButton href={route('users.create')} variant="light">
                        <UserPlus />
                        {t('Add a user')}
                    </LinkButton>
                </div>
            </WelcomeBanner>

            <PushPrompt />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                <StatCard icon={GraduationCap} label={t('Active students')} value={formatNumber(stats.students, locale)} tone="emerald" />
                <StatCard icon={Users} label={t('Teachers')} value={formatNumber(stats.teachers, locale)} tone="gold" />
                <StatCard icon={BookOpen} label={t('Active halaqat')} value={formatNumber(stats.halaqat, locale)} tone="sky" />
                <StatCard icon={CalendarDays} label={t('Sessions in 7 days')} value={formatNumber(stats.sessions_week, locale)} tone="violet" />
                <StatCard
                    icon={Percent}
                    label={t('Attendance rate')}
                    value={stats.attendance_rate === null ? '—' : `${stats.attendance_rate}%`}
                    hint={t('Last 30 days')}
                    tone="teal"
                />
                <StatCard
                    icon={BookOpenCheck}
                    label={t('Ayahs memorized')}
                    value={formatNumber(stats.memorized_month, locale)}
                    hint={t('This month')}
                    tone="amber"
                />
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader title={t('Weekly attendance rate')} description={t('Last 8 weeks')} icon={ChartColumn} />
                    <AttendanceTrendChart data={attendanceTrend} className="p-5 sm:p-6" />
                </Card>
                <Card>
                    <CardHeader title={t('Memorization and revision (ayahs)')} description={t('Last 8 weeks')} icon={BookOpenCheck} />
                    <MemorizationTrendChart data={memorizationTrend} className="p-5 sm:p-6" />
                </Card>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader
                        title={t("Today's sessions")}
                        icon={CalendarDays}
                        actions={
                            <LinkButton href={route('sessions.create')} variant="secondary" size="sm">
                                <CalendarPlus />
                                {t('Schedule a session')}
                            </LinkButton>
                        }
                    />
                    {todaySessions.length === 0 ? (
                        <EmptyState icon={CalendarDays} title={t('No sessions today')} compact />
                    ) : (
                        <div className="divide-y divide-line">
                            {todaySessions.map((session) => (
                                <SessionRow key={session.id} session={session} />
                            ))}
                        </div>
                    )}
                </Card>
                <TopStudentsCard students={topStudents} />
            </div>

            {pendingSubmissions.length > 0 && (
                <div className="mt-6">
                    <PendingSubmissionsCard submissions={pendingSubmissions} />
                </div>
            )}

            <Card className="mt-6">
                <CardHeader
                    title={t('Latest recitations')}
                    icon={BookOpenCheck}
                    actions={
                        <LinkButton href={route('progress.index')} variant="ghost" size="sm">
                            {t('View all')}
                        </LinkButton>
                    }
                />
                <RecordList records={recentRecords} showStudent />
            </Card>
        </AppLayout>
    );
}
