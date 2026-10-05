import { Link, router, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpenCheck,
    CalendarDays,
    CalendarPlus,
    CirclePlay,
    Copy,
    EllipsisVertical,
    GraduationCap,
    MessagesSquare,
    Pencil,
    Percent,
    Plus,
    RefreshCw,
    Trash,
    UserMinus,
    UserPlus,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { GradeBadge } from '@/components/badges';
import { IslamicPattern } from '@/components/brand';
import { ScheduleChips } from '@/components/halaqa/schedule-chips';
import { RecordForm } from '@/components/progress/record-form';
import { RecordList } from '@/components/progress/record-list';
import { SessionRow } from '@/components/session/session-row';
import { Avatar } from '@/components/ui/avatar';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { CheckboxList } from '@/components/ui/checkbox-list';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { StatCard } from '@/components/ui/stat-card';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import { VideoCard, VideoForm, VideoPlayer } from '@/components/video/video-components';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { colorOf, formatNumber } from '@/lib/utils';
import type { Grade, HalaqaItem, ProgressRecordItem, SessionItem, UserRef, VideoItem } from '@/types';

interface StudentRow {
    student: UserRef;
    memorized?: number;
    revised?: number;
    records_count?: number;
    average_grade?: Grade | null;
    attendance_rate?: number | null;
    last_record_on?: string | null;
    total_memorized?: number;
}

interface HalaqaShowProps {
    halaqa: HalaqaItem;
    students: StudentRow[];
    upcomingSessions: SessionItem[];
    recentSessions: SessionItem[];
    recentRecords: ProgressRecordItem[];
    videos: VideoItem[];
    stats: { attendance_rate: number | null; memorized_month: number; sessions_month: number };
    availableStudents: { id: number; name: string; avatar_url: string | null }[];
    can: { manage: boolean; update: boolean; delete: boolean };
}

type Tab = 'students' | 'sessions' | 'records' | 'videos';

export default function HalaqaShow(props: HalaqaShowProps) {
    const { halaqa, students, upcomingSessions, recentSessions, recentRecords, videos, stats, availableStudents, can } = props;
    const { t, locale } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const color = colorOf(halaqa.color);

    const [tab, setTab] = useState<Tab>(can.manage ? 'students' : 'sessions');
    const [adding, setAdding] = useState(false);
    const [removing, setRemoving] = useState<UserRef | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [recordFor, setRecordFor] = useState<{ id: number; name: string } | null>(null);
    const [editingRecord, setEditingRecord] = useState<ProgressRecordItem | null>(null);
    const [videoForm, setVideoForm] = useState<{ open: boolean; video: VideoItem | null }>({ open: false, video: null });
    const [playing, setPlaying] = useState<VideoItem | null>(null);

    const addForm = useForm({ student_ids: [] as number[] });

    const addStudents = () => {
        addForm.post(route('halaqat.students.store', halaqa.id), {
            preserveScroll: true,
            onSuccess: () => {
                setAdding(false);
                addForm.reset();
            },
        });
    };

    const generate = () => router.post(route('halaqat.generate-sessions', halaqa.id), {}, { preserveScroll: true });

    return (
        <AppLayout title={halaqa.name} hideHeader>
            <Link href={route('halaqat.index')} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink">
                <ArrowRight className="size-4 ltr:rotate-180" />
                {t('Halaqat')}
            </Link>

            <div className="relative overflow-hidden rounded-3xl border border-line bg-surface">
                <div className={`relative h-28 bg-linear-to-br ${color.gradient}`}>
                    <IslamicPattern className="text-white/[0.12]" size={56} />
                </div>
                <div className="relative px-5 pt-4 pb-6 sm:px-8">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex items-start gap-4">
                            {halaqa.teacher ? (
                                <Avatar name={halaqa.teacher.name} src={halaqa.teacher.avatar_url} size="xl" className="-mt-14 ring-4" />
                            ) : (
                                <span className="-mt-14 flex size-20 shrink-0 items-center justify-center rounded-full bg-surface-muted ring-4 ring-surface">
                                    <Users className="size-8 text-muted" />
                                </span>
                            )}
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold text-ink sm:text-3xl">{halaqa.name}</h1>
                                <p className="mt-1 text-sm text-muted">{halaqa.teacher ? halaqa.teacher.name : t('No teacher assigned')}</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <LinkButton href={route('chat.show', halaqa.id)} variant="secondary">
                                <MessagesSquare />
                                {t('Halaqa chat')}
                            </LinkButton>
                            {can.manage && (
                                <LinkButton href={route('sessions.create', { halaqa_id: halaqa.id })}>
                                    <CalendarPlus />
                                    {t('Extra session')}
                                </LinkButton>
                            )}
                            {can.manage && (
                                <Dropdown
                                    trigger={
                                        <Button variant="secondary" size="icon" aria-label={t('More')}>
                                            <EllipsisVertical />
                                        </Button>
                                    }
                                >
                                    <DropdownItem icon={RefreshCw} onClick={generate}>
                                        {t('Create upcoming sessions now')}
                                    </DropdownItem>
                                    {can.update && (
                                        <DropdownItem icon={Pencil} href={route('halaqat.edit', halaqa.id)}>
                                            {t('Edit halaqa')}
                                        </DropdownItem>
                                    )}
                                    {can.delete && (
                                        <>
                                            <DropdownSeparator />
                                            <DropdownItem icon={Trash} danger onClick={() => setDeleting(true)}>
                                                {t('Delete halaqa')}
                                            </DropdownItem>
                                        </>
                                    )}
                                </Dropdown>
                            )}
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2">
                        {halaqa.level && <span className={`rounded-full px-3 py-1 text-xs font-semibold ${color.soft}`}>{labels.level[halaqa.level]}</span>}
                        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-ink ring-1 ring-line">
                            {labels.halaqaGender[halaqa.gender]}
                        </span>
                        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-ink ring-1 ring-line">
                            {labels.provider[halaqa.meeting_provider]}
                        </span>
                        <span className="rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-ink ring-1 ring-line">
                            {t(':count minutes', { count: halaqa.duration_minutes })}
                        </span>
                        {!halaqa.is_active && <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold text-stone-700">{t('Archived')}</span>}
                    </div>

                    {halaqa.description && <p dir="auto" className="mt-4 max-w-3xl leading-relaxed text-ink/80">{halaqa.description}</p>}

                    <div className="mt-4">
                        <ScheduleChips schedule={halaqa.schedule} />
                    </div>

                    {can.manage && halaqa.meeting_url && (
                        <div className="mt-4 flex max-w-xl items-center gap-2 rounded-xl bg-surface-muted px-3 py-2 text-sm">
                            <span className="truncate text-muted" dir="ltr">
                                {halaqa.meeting_url}
                            </span>
                            <button
                                type="button"
                                className="ms-auto shrink-0 text-primary-700 dark:text-primary-300"
                                onClick={() => navigator.clipboard.writeText(halaqa.meeting_url ?? '').then(() => toast.success(t('Link copied')))}
                            >
                                <Copy className="size-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard
                    icon={Users}
                    label={t('Students')}
                    value={`${halaqa.students_count ?? students.length}${halaqa.capacity ? ` / ${halaqa.capacity}` : ''}`}
                    tone="emerald"
                />
                <StatCard
                    icon={Percent}
                    label={t('Attendance rate')}
                    value={stats.attendance_rate === null ? '—' : `${stats.attendance_rate}%`}
                    hint={t('Last 30 days')}
                    tone="sky"
                />
                <StatCard
                    icon={BookOpenCheck}
                    label={t('Ayahs memorized')}
                    value={formatNumber(stats.memorized_month, locale)}
                    hint={t('Last 30 days')}
                    tone="gold"
                />
                <StatCard icon={CalendarDays} label={t('Completed sessions')} value={stats.sessions_month} hint={t('Last 30 days')} tone="violet" />
            </div>

            <Tabs
                className="mt-8"
                value={tab}
                onChange={setTab}
                items={[
                    { value: 'students', label: t('Students'), icon: GraduationCap, count: students.length },
                    { value: 'sessions', label: t('Sessions'), icon: CalendarDays },
                    { value: 'records', label: t('Recitations'), icon: BookOpenCheck },
                    { value: 'videos', label: t('Videos'), icon: CirclePlay, count: videos.length },
                ]}
            />

            <div className="mt-4">
                {tab === 'students' && (
                    <Card>
                        <CardHeader
                            title={t('Students of the halaqa')}
                            icon={GraduationCap}
                            actions={
                                can.update && (
                                    <Button size="sm" onClick={() => setAdding(true)}>
                                        <UserPlus />
                                        {t('Add students')}
                                    </Button>
                                )
                            }
                        />
                        {students.length === 0 ? (
                            <EmptyState icon={Users} title={t('No students in this halaqa yet')} compact />
                        ) : can.manage ? (
                            <Table>
                                <thead>
                                    <tr>
                                        <Th>{t('Student')}</Th>
                                        <Th>{t('Total memorized')}</Th>
                                        <Th>{t('Memorized (60 days)')}</Th>
                                        <Th>{t('Attendance')}</Th>
                                        <Th>{t('Average grade')}</Th>
                                        <Th>{t('Last recitation')}</Th>
                                        <Th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((row) => (
                                        <Tr key={row.student.id}>
                                            <Td>
                                                <Link href={route('progress.student', row.student.id)} className="flex items-center gap-3">
                                                    <Avatar name={row.student.name} src={row.student.avatar_url} size="sm" />
                                                    <span className="font-semibold text-ink hover:text-primary-700">{row.student.name}</span>
                                                </Link>
                                            </Td>
                                            <Td className="tabular-nums">{t(':count ayahs', { count: formatNumber(row.total_memorized ?? 0, locale) })}</Td>
                                            <Td className="tabular-nums">{formatNumber(row.memorized ?? 0, locale)}</Td>
                                            <Td>
                                                {row.attendance_rate === null || row.attendance_rate === undefined ? (
                                                    <span className="text-muted">—</span>
                                                ) : (
                                                    <span
                                                        className={
                                                            row.attendance_rate >= 80
                                                                ? 'font-semibold text-emerald-600'
                                                                : row.attendance_rate >= 60
                                                                  ? 'font-semibold text-amber-600'
                                                                  : 'font-semibold text-rose-600'
                                                        }
                                                    >
                                                        {row.attendance_rate}%
                                                    </span>
                                                )}
                                            </Td>
                                            <Td>{row.average_grade ? <GradeBadge grade={row.average_grade} /> : <span className="text-muted">—</span>}</Td>
                                            <Td className="text-muted">{row.last_record_on ? dates.day(row.last_record_on) : '—'}</Td>
                                            <Td>
                                                <div className="flex justify-end gap-1">
                                                    <Button variant="outline" size="xs" onClick={() => setRecordFor({ id: row.student.id, name: row.student.name })}>
                                                        <Plus />
                                                        {t('Recitation')}
                                                    </Button>
                                                    {can.update && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            className="hover:text-rose-600"
                                                            aria-label={t('Remove from halaqa')}
                                                            onClick={() => setRemoving(row.student)}
                                                        >
                                                            <UserMinus />
                                                        </Button>
                                                    )}
                                                </div>
                                            </Td>
                                        </Tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : (
                            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
                                {students.map((row) => (
                                    <div key={row.student.id} className="flex items-center gap-3 rounded-2xl bg-surface-muted px-4 py-3">
                                        <Avatar name={row.student.name} src={row.student.avatar_url} size="sm" />
                                        <span className="truncate text-sm font-semibold text-ink">{row.student.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

                {tab === 'sessions' && (
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card>
                            <CardHeader title={t('Upcoming sessions')} icon={CalendarDays} />
                            {upcomingSessions.length === 0 ? (
                                <EmptyState icon={CalendarDays} title={t('No upcoming sessions')} compact />
                            ) : (
                                <div className="divide-y divide-line">
                                    {upcomingSessions.map((session) => (
                                        <SessionRow key={session.id} session={session} showHalaqa={false} showTeacher={false} />
                                    ))}
                                </div>
                            )}
                        </Card>
                        <Card>
                            <CardHeader
                                title={t('Previous sessions')}
                                icon={CalendarDays}
                                actions={
                                    <LinkButton href={route('sessions.index', { halaqa_id: halaqa.id, view: 'past' })} variant="ghost" size="sm">
                                        {t('View all')}
                                    </LinkButton>
                                }
                            />
                            {recentSessions.length === 0 ? (
                                <EmptyState icon={CalendarDays} title={t('No previous sessions')} compact />
                            ) : (
                                <div className="divide-y divide-line">
                                    {recentSessions.map((session) => (
                                        <SessionRow key={session.id} session={session} showHalaqa={false} showTeacher={false} />
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {tab === 'records' && (
                    <Card>
                        <CardHeader title={t('Latest recitations')} icon={BookOpenCheck} />
                        <RecordList records={recentRecords} showStudent={can.manage} showHalaqa={false} onEdit={setEditingRecord} />
                    </Card>
                )}

                {tab === 'videos' && (
                    <div>
                        {can.manage && (
                            <div className="mb-4 flex justify-end">
                                <Button onClick={() => setVideoForm({ open: true, video: null })}>
                                    <Plus />
                                    {t('Add a video')}
                                </Button>
                            </div>
                        )}
                        {videos.length === 0 ? (
                            <Card>
                                <EmptyState icon={CirclePlay} title={t('No videos for this halaqa yet')} compact />
                            </Card>
                        ) : (
                            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                {videos.map((video) => (
                                    <VideoCard
                                        key={video.id}
                                        video={video}
                                        onPlay={() => setPlaying(video)}
                                        onEdit={() => setVideoForm({ open: true, video })}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <Modal
                open={adding}
                onClose={() => setAdding(false)}
                title={t('Add students')}
                description={t('Students matching the halaqa category who are not in it yet.')}
                footer={
                    <>
                        <Button variant="secondary" onClick={() => setAdding(false)}>
                            {t('Cancel')}
                        </Button>
                        <Button onClick={addStudents} loading={addForm.processing} disabled={addForm.data.student_ids.length === 0}>
                            <UserPlus />
                            {t('Add')}
                        </Button>
                    </>
                }
            >
                <CheckboxList
                    options={availableStudents}
                    value={addForm.data.student_ids}
                    onChange={(ids) => addForm.setData('student_ids', ids)}
                    emptyText={t('All students are already in this halaqa.')}
                />
                {addForm.errors.student_ids && <p className="mt-2 text-xs font-medium text-rose-600">{addForm.errors.student_ids}</p>}
            </Modal>

            <ConfirmDialog
                open={removing !== null}
                onClose={() => setRemoving(null)}
                onConfirm={() =>
                    removing &&
                    router.delete(route('halaqat.students.destroy', { halaqa: halaqa.id, student: removing.id }), {
                        preserveScroll: true,
                        onFinish: () => setRemoving(null),
                    })
                }
                title={t('Remove :name from the halaqa?', { name: removing?.name ?? '' })}
                message={t('Previous attendance and recitations are kept.')}
                confirmLabel={t('Remove')}
            />

            <ConfirmDialog
                open={deleting}
                onClose={() => setDeleting(false)}
                onConfirm={() => router.delete(route('halaqat.destroy', halaqa.id))}
                title={t('Delete :name?', { name: halaqa.name })}
                message={t('Sessions, attendance and chat of this halaqa will be deleted. Recitation records stay in the students’ history. To keep everything, archive the halaqa instead.')}
                confirmLabel={t('Delete permanently')}
            />

            <RecordForm
                open={recordFor !== null || editingRecord !== null}
                onClose={() => {
                    setRecordFor(null);
                    setEditingRecord(null);
                }}
                student={recordFor}
                record={editingRecord}
                halaqat={[{ id: halaqa.id, name: halaqa.name, color: halaqa.color }]}
                defaultHalaqaId={halaqa.id}
            />

            <VideoForm
                open={videoForm.open}
                onClose={() => setVideoForm({ open: false, video: null })}
                video={videoForm.video}
                halaqat={[{ id: halaqa.id, name: halaqa.name, color: halaqa.color }]}
                allowGeneral={false}
                defaultHalaqaId={halaqa.id}
            />

            <VideoPlayer video={playing} onClose={() => setPlaying(null)} />
        </AppLayout>
    );
}
