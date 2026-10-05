import { Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BookOpen,
    BookOpenCheck,
    Building2,
    CalendarDays,
    CalendarPlus,
    ChartColumn,
    GraduationCap,
    Inbox,
    Percent,
    Plus,
    UserPlus,
    UserRound,
    Users,
} from 'lucide-react';
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
import { cn, formatNumber } from '@/lib/utils';
import type { ProgressRecordItem, RecitationSubmissionItem, SessionItem, WeeklyAttendance, WeeklyMemorization } from '@/types';

interface AdminDashboardProps {
    /** The academy of a manager (none for the administration, who sees the whole platform). */
    academy: { id: number; name: string; logo_url: string | null } | null;
    platform: { academies: number; independent_students: number; join_requests: number; contact_messages: number } | null;
    /** Requests to join the manager's academy waiting for an answer. */
    joinRequests: number | null;
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

/**
 * The first name, keeping an abbreviated title with it ("أ. محمد", "Dr. Ahmad").
 */
function firstName(name: string): string {
    const words = name.trim().split(/s+/);

    return words[0]?.endsWith('.') && words.length > 1 ? `${words[0]} ${words[1]}` : (words[0] ?? '');
}

function PlatformLink({ href, icon: Icon, label, value, highlight = false }: { href: string; icon: typeof Inbox; label: string; value: string; highlight?: boolean }) {
    return (
        <Link
            href={href}
            className={cn(
                'group flex items-center gap-3 rounded-2xl border px-4 py-3 transition hover:border-line-strong hover:shadow-sm',
                highlight ? 'border-gold-300 bg-gold-50 dark:border-gold-500/30 dark:bg-gold-500/10' : 'border-line bg-surface',
            )}
        >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                <Icon className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block text-xl font-bold text-ink tabular-nums">{value}</span>
                <span className="block truncate text-xs text-muted">{label}</span>
            </span>
            <ArrowLeft className="size-4 text-muted transition group-hover:text-ink ltr:rotate-180" />
        </Link>
    );
}

export default function AdminDashboard({
    academy,
    platform,
    joinRequests,
    stats,
    attendanceTrend,
    memorizationTrend,
    todaySessions,
    recentRecords,
    topStudents,
    pendingSubmissions,
}: AdminDashboardProps) {
    const { t, locale } = useTrans();
    const { auth } = usePage().props;

    return (
        <AppLayout title={t('Dashboard')} hideHeader>
            <WelcomeBanner
                title={t('Peace be upon you, :name', { name: firstName(auth.user?.name ?? '') })}
                subtitle={
                    academy
                        ? t('Here is an overview of :academy today: sessions, attendance and memorization progress.', { academy: academy.name })
                        : t('Here is an overview of the platform today: its academies, sessions, attendance and memorization progress.')
                }
            >
                <div className="flex flex-wrap gap-2">
                    {platform && (
                        <LinkButton href={route('academies.create')} variant="gold">
                            <Building2 />
                            {t('Add an academy')}
                        </LinkButton>
                    )}
                    <LinkButton href={route('halaqat.create')} variant={platform ? 'light' : 'gold'}>
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

            {platform && (
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <PlatformLink href={route('academies.index')} icon={Building2} label={t('Active academies')} value={formatNumber(platform.academies, locale)} />
                    <PlatformLink
                        href={route('join-requests.index')}
                        icon={UserPlus}
                        label={t('Join requests waiting')}
                        value={formatNumber(platform.join_requests, locale)}
                        highlight={platform.join_requests > 0}
                    />
                    <PlatformLink
                        href={route('users.index', { role: 'student' })}
                        icon={UserRound}
                        label={t('Students without academy')}
                        value={formatNumber(platform.independent_students, locale)}
                    />
                    <PlatformLink
                        href={route('contact-messages.index', { filter: 'unread' })}
                        icon={Inbox}
                        label={t('Unread contact messages')}
                        value={formatNumber(platform.contact_messages, locale)}
                        highlight={platform.contact_messages > 0}
                    />
                </div>
            )}

            {!!joinRequests && (
                <Link
                    href={route('join-requests.index')}
                    className="mb-6 flex items-center gap-3 rounded-2xl border border-gold-300 bg-gold-50 px-5 py-4 text-gold-900 transition hover:shadow-sm dark:border-gold-500/30 dark:bg-gold-500/10 dark:text-gold-100"
                >
                    <UserPlus className="size-5 shrink-0" />
                    <span className="min-w-0 flex-1 text-sm font-semibold">{t('Requests to join your academy waiting for your answer: :count', { count: joinRequests })}</span>
                    <span className="text-xs font-bold underline underline-offset-4">{t('Answer them')}</span>
                </Link>
            )}

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
