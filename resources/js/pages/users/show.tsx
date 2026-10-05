import { router } from '@inertiajs/react';
import {
    BookOpenCheck,
    Building2,
    CalendarDays,
    ClipboardCheck,
    FileText,
    Globe,
    GraduationCap,
    Languages,
    Layers,
    Mail,
    Pencil,
    Percent,
    Phone,
    Power,
    Printer,
    StickyNote,
    Trash,
    UserRound,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { RoleBadge } from '@/components/badges';
import { HalaqaCard } from '@/components/halaqa/halaqa-card';
import { JuzMap } from '@/components/progress/juz-map';
import { RecordList } from '@/components/progress/record-list';
import { SessionRow } from '@/components/session/session-row';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/modal';
import { StatCard } from '@/components/ui/stat-card';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { formatNumber } from '@/lib/utils';
import type { HalaqaItem, ProgressRecordItem, ProgressSummary, SessionItem, UserDetails } from '@/types';

interface UserShowProps {
    user: UserDetails;
    summary?: ProgressSummary;
    records?: ProgressRecordItem[];
    halaqat?: HalaqaItem[];
    sessions?: SessionItem[];
    teacherStats?: { students: number; sessions_completed: number; records: number };
}

export default function UserShow({ user, summary, records, halaqat = [], sessions, teacherStats }: UserShowProps) {
    const { t, locale } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const [deleting, setDeleting] = useState(false);

    const details: { icon: typeof Mail; label: string; value: string | null; ltr?: boolean }[] = [
        ...(user.role !== 'admin'
            ? [{ icon: Building2, label: t('Academy'), value: user.academy?.name ?? (user.role === 'student' ? t('Independent (without academy)') : null) }]
            : []),
        { icon: Mail, label: t('Email'), value: user.email, ltr: true },
        { icon: Phone, label: t('Phone'), value: user.phone, ltr: true },
        { icon: UserRound, label: t('Gender'), value: user.gender ? labels.gender[user.gender] : null },
        { icon: CalendarDays, label: t('Date of birth'), value: user.birth_date ? dates.day(user.birth_date) : null },
        { icon: Globe, label: t('Country'), value: user.country },
        { icon: Globe, label: t('Timezone'), value: user.timezone, ltr: true },
        { icon: Languages, label: t('Language'), value: user.locale === 'ar' ? 'العربية' : 'English' },
        { icon: Power, label: t('Last sign in'), value: user.last_login_at ? dates.dateTime(user.last_login_at) : t('Never') },
    ];

    if (user.role === 'student') {
        details.push(
            { icon: Users, label: t('Guardian name'), value: user.guardian_name },
            { icon: Phone, label: t('Guardian phone'), value: user.guardian_phone, ltr: true },
        );
    }

    return (
        <AppLayout title={user.name} hideHeader>
            <div className="mb-6 flex flex-col gap-5 rounded-3xl border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Avatar name={user.name} src={user.avatar_url} size="xl" />
                    <div>
                        <h1 className="text-2xl font-bold text-ink">{user.name}</h1>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <RoleBadge role={user.role} />
                            {user.is_active ? <Badge tone="emerald" dot>{t('Active')}</Badge> : <Badge tone="slate">{t('Deactivated')}</Badge>}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {user.role === 'student' && (
                        <>
                            <LinkButton href={route('progress.student', user.id)}>
                                <BookOpenCheck />
                                {t('Progress')}
                            </LinkButton>
                            <LinkButton href={route('reports.student', user.id)} variant="secondary">
                                <Printer />
                                {t('Report')}
                            </LinkButton>
                        </>
                    )}
                    <LinkButton href={route('users.edit', user.id)} variant="secondary">
                        <Pencil />
                        {t('Edit')}
                    </LinkButton>
                    <Button variant="secondary" onClick={() => router.patch(route('users.toggle-active', user.id), {}, { preserveScroll: true })}>
                        <Power />
                        {user.is_active ? t('Deactivate') : t('Activate')}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(true)} aria-label={t('Delete')}>
                        <Trash />
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    {summary && (
                        <>
                            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                                <StatCard
                                    icon={BookOpenCheck}
                                    label={t('Ayahs memorized')}
                                    value={formatNumber(summary.coverage.ayahs, locale)}
                                    hint={`${summary.coverage.percent}%`}
                                    tone="emerald"
                                />
                                <StatCard icon={Layers} label={t('Completed ajza')} value={summary.coverage.completed_juz} tone="gold" />
                                <StatCard
                                    icon={Percent}
                                    label={t('Attendance rate')}
                                    value={summary.attendance.rate === null ? '—' : `${summary.attendance.rate}%`}
                                    tone="sky"
                                />
                                <StatCard
                                    icon={GraduationCap}
                                    label={t('Average grade')}
                                    value={summary.average_grade ? labels.grade[summary.average_grade] : '—'}
                                    tone="violet"
                                />
                            </div>
                            <Card>
                                <CardHeader title={t('Memorization map')} icon={Layers} />
                                <CardBody>
                                    <JuzMap juz={summary.coverage.juz} />
                                </CardBody>
                            </Card>
                            <Card>
                                <CardHeader title={t('Latest recitations')} icon={BookOpenCheck} />
                                <RecordList records={records ?? []} />
                            </Card>
                        </>
                    )}

                    {teacherStats && (
                        <>
                            <div className="grid grid-cols-3 gap-4">
                                <StatCard icon={Users} label={t('Students')} value={teacherStats.students} tone="emerald" />
                                <StatCard icon={ClipboardCheck} label={t('Completed sessions')} value={teacherStats.sessions_completed} hint={t('Last 30 days')} tone="sky" />
                                <StatCard icon={BookOpenCheck} label={t('Recitations')} value={teacherStats.records} hint={t('Last 30 days')} tone="gold" />
                            </div>
                            <Card>
                                <CardHeader title={t('Latest sessions')} icon={CalendarDays} />
                                {sessions && sessions.length > 0 ? (
                                    <div className="divide-y divide-line">
                                        {sessions.map((session) => (
                                            <SessionRow key={session.id} session={session} showTeacher={false} />
                                        ))}
                                    </div>
                                ) : (
                                    <EmptyState icon={CalendarDays} title={t('No sessions yet')} compact />
                                )}
                            </Card>
                        </>
                    )}

                    {halaqat.length > 0 && (
                        <div>
                            <h2 className="mb-4 text-lg font-bold text-ink">{t('Halaqat')}</h2>
                            <div className="grid gap-5 sm:grid-cols-2">
                                {halaqat.map((halaqa) => (
                                    <HalaqaCard key={halaqa.id} halaqa={halaqa} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader title={t('Details')} icon={FileText} />
                        <dl className="divide-y divide-line">
                            {details.map((item) => (
                                <div key={item.label} className="flex items-center justify-between gap-4 px-5 py-3 text-sm sm:px-6">
                                    <dt className="flex items-center gap-2 text-muted">
                                        <item.icon className="size-4" />
                                        {item.label}
                                    </dt>
                                    <dd className="truncate text-end font-medium text-ink" dir={item.ltr ? 'ltr' : undefined}>
                                        {item.value || '—'}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </Card>

                    {user.bio && (
                        <Card>
                            <CardHeader title={t('About')} icon={UserRound} />
                            <CardBody className="text-sm leading-relaxed text-ink/85">{user.bio}</CardBody>
                        </Card>
                    )}

                    {user.admin_notes && (
                        <Card className="border-gold-200 dark:border-gold-500/20">
                            <CardHeader title={t('Administration notes')} icon={StickyNote} />
                            <CardBody className="whitespace-pre-line text-sm leading-relaxed text-ink/85">{user.admin_notes}</CardBody>
                        </Card>
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={deleting}
                onClose={() => setDeleting(false)}
                onConfirm={() => router.delete(route('users.destroy', user.id))}
                title={t('Delete :name?', { name: user.name })}
                message={t('All attendance and recitation records of this user will be deleted permanently. Deactivate the account instead to keep the history.')}
                confirmLabel={t('Delete permanently')}
            />
        </AppLayout>
    );
}
