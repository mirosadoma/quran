import { Link, router, useForm, usePage, usePoll } from '@inertiajs/react';
import {
    BookOpenCheck,
    CalendarX,
    CheckCheck,
    CircleStop,
    ClipboardCheck,
    Clock,
    Copy,
    ExternalLink,
    FileText,
    Info,
    KeyRound,
    Pencil,
    Plus,
    Trash,
    TriangleAlert,
    UserRound,
    Video,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AttendanceBadge, SessionStatusBadge } from '@/components/badges';
import { RecordForm } from '@/components/progress/record-form';
import { RecordList } from '@/components/progress/record-list';
import { Countdown } from '@/components/session/countdown';
import { JoinSessionButton } from '@/components/session/join-button';
import { Avatar } from '@/components/ui/avatar';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, CardBody, CardFooter, CardHeader } from '@/components/ui/card';
import { Field, Input, Textarea } from '@/components/ui/form';
import { ConfirmDialog } from '@/components/ui/modal';
import { useRealtime } from '@/hooks/use-realtime';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { attendanceStatuses, attendanceTone, useLabels } from '@/lib/labels';
import { cn, colorOf } from '@/lib/utils';
import type { AttendanceStatus, ProgressRecordItem, SessionItem, UserRef } from '@/types';

interface SessionDetails extends SessionItem {
    notes: string | null;
    recording_url: string | null;
    recording_passcode: string | null;
    started_at: string | null;
    ended_at: string | null;
    meeting_url: string | null;
    meeting_password: string | null;
    meeting_configured: boolean;
    embedded: boolean;
    join_opens_at: string;
    created_by: string | null;
}

interface AttendanceRow {
    student: UserRef;
    status: AttendanceStatus | null;
    joined_at: string | null;
    notes: string | null;
}

interface SessionShowProps {
    session: SessionDetails;
    attendance: AttendanceRow[] | null;
    myAttendance: { status: AttendanceStatus; joined_at: string | null } | null;
    records: ProgressRecordItem[];
    students: { id: number; name: string }[];
    can: { manage: boolean; join: boolean; edit: boolean; cancel: boolean; end: boolean; delete: boolean };
}

const statusButton: Record<string, string> = {
    emerald: 'data-[on=true]:bg-emerald-600 data-[on=true]:text-white data-[on=true]:ring-emerald-600',
    amber: 'data-[on=true]:bg-amber-500 data-[on=true]:text-white data-[on=true]:ring-amber-500',
    rose: 'data-[on=true]:bg-rose-600 data-[on=true]:text-white data-[on=true]:ring-rose-600',
    sky: 'data-[on=true]:bg-sky-600 data-[on=true]:text-white data-[on=true]:ring-sky-600',
};

export default function SessionShow({ session, attendance, myAttendance, records, students, can }: SessionShowProps) {
    const { t } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const { realtime } = usePage().props;
    const color = colorOf(session.halaqa?.color);

    const [cancelOpen, setCancelOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [endOpen, setEndOpen] = useState(false);
    const [recordOpen, setRecordOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<ProgressRecordItem | null>(null);

    const open = session.status === 'scheduled' || session.status === 'live';
    const upcoming = session.status === 'scheduled' && new Date(session.starts_at).getTime() > Date.now();

    useRealtime<{ id: number }>('session', (event) => {
        if (event.id === session.id) {
            router.reload();
        }
    });

    usePoll(30_000, {}, { autoStart: open && !realtime.enabled });

    const cancelForm = useForm({ reason: '' });
    const attendanceForm = useForm({
        attendances: (attendance ?? []).map((row) => ({ student_id: row.student.id, status: row.status, notes: row.notes ?? '' })),
    });
    const notesForm = useForm({ notes: session.notes ?? '', recording_url: session.recording_url ?? '' });

    const setStatus = (studentId: number, status: AttendanceStatus | null) => {
        attendanceForm.setData(
            'attendances',
            attendanceForm.data.attendances.map((row) => (row.student_id === studentId ? { ...row, status } : row)),
        );
    };

    const markAllPresent = () => {
        attendanceForm.setData(
            'attendances',
            attendanceForm.data.attendances.map((row) => ({ ...row, status: row.status ?? 'present' })),
        );
    };

    const copy = (value: string) => navigator.clipboard.writeText(value).then(() => toast.success(t('Copied')));

    return (
        <AppLayout
            title={session.display_title}
            heading={
                <span className="flex flex-wrap items-center gap-3">
                    {session.display_title}
                    <SessionStatusBadge status={session.status} />
                </span>
            }
            description={
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {session.halaqa && (
                        <Link href={route('halaqat.show', session.halaqa.id)} className="inline-flex items-center gap-1.5 font-medium hover:text-ink">
                            <span className={cn('size-2 rounded-full', color.dot)} />
                            {session.halaqa.name}
                        </Link>
                    )}
                    <span className="inline-flex items-center gap-1.5">
                        <Clock className="size-4" />
                        {dates.dateTime(session.starts_at)} – {dates.time(session.ends_at)}
                    </span>
                    {session.teacher && (
                        <span className="inline-flex items-center gap-1.5">
                            <UserRound className="size-4" />
                            {session.teacher.name}
                        </span>
                    )}
                </span>
            }
            back={{ href: route('sessions.index'), label: t('Sessions') }}
            actions={
                <>
                    <JoinSessionButton session={session} />
                    {can.end && (
                        <Button variant="danger-soft" onClick={() => setEndOpen(true)}>
                            <CircleStop />
                            {t('End the session')}
                        </Button>
                    )}
                    {can.edit && (
                        <LinkButton href={route('sessions.edit', session.id)} variant="secondary">
                            <Pencil />
                            {t('Edit')}
                        </LinkButton>
                    )}
                    {can.cancel && (
                        <Button variant="secondary" onClick={() => setCancelOpen(true)}>
                            <CalendarX />
                            {t('Cancel session')}
                        </Button>
                    )}
                    {can.delete && (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteOpen(true)} aria-label={t('Delete')}>
                            <Trash />
                        </Button>
                    )}
                </>
            }
        >
            {session.status === 'cancelled' && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                    <CalendarX className="mt-0.5 size-5 shrink-0" />
                    <div>
                        <p className="font-semibold">{t('This session was cancelled.')}</p>
                        {session.cancel_reason && <p className="mt-1">{session.cancel_reason}</p>}
                    </div>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-6 lg:col-span-2">
                    {upcoming && (
                        <Card className="relative overflow-hidden">
                            <CardBody className="flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-start">
                                <div>
                                    <p className="text-sm text-muted">{t('Starts in')}</p>
                                    <p className="mt-1 font-semibold text-ink">{dates.dateTime(session.starts_at)}</p>
                                    {!can.manage && !can.join && (
                                        <p className="mt-2 text-xs text-muted">
                                            {t('You can join from :time.', { time: dates.time(session.join_opens_at) })}
                                        </p>
                                    )}
                                </div>
                                <Countdown target={session.starts_at} />
                            </CardBody>
                        </Card>
                    )}

                    {attendance && (
                        <Card>
                            <CardHeader
                                title={t('Attendance')}
                                description={t('Students who press "Join" are marked present automatically.')}
                                icon={ClipboardCheck}
                                actions={
                                    <Button variant="ghost" size="sm" onClick={markAllPresent}>
                                        <CheckCheck />
                                        {t('Mark the rest present')}
                                    </Button>
                                }
                            />
                            {attendance.length === 0 ? (
                                <p className="px-6 py-8 text-center text-sm text-muted">{t('No students in this halaqa.')}</p>
                            ) : (
                                <ul className="divide-y divide-line">
                                    {attendance.map((row, index) => {
                                        const current = attendanceForm.data.attendances[index];

                                        return (
                                            <li key={row.student.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:px-6">
                                                <div className="flex min-w-0 flex-1 items-center gap-3">
                                                    <Avatar name={row.student.name} src={row.student.avatar_url} size="sm" />
                                                    <div className="min-w-0">
                                                        <Link
                                                            href={route('progress.student', row.student.id)}
                                                            className="block truncate text-sm font-semibold text-ink hover:text-primary-700"
                                                        >
                                                            {row.student.name}
                                                        </Link>
                                                        {row.joined_at && (
                                                            <p className="text-xs text-muted">{t('Joined at :time', { time: dates.time(row.joined_at) })}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {attendanceStatuses.map((status) => (
                                                        <button
                                                            key={status}
                                                            type="button"
                                                            data-on={current?.status === status}
                                                            onClick={() => setStatus(row.student.id, current?.status === status ? null : status)}
                                                            className={cn(
                                                                'rounded-lg px-3 py-1.5 text-xs font-semibold text-muted ring-1 ring-line transition hover:text-ink',
                                                                statusButton[attendanceTone[status]],
                                                            )}
                                                        >
                                                            {labels.attendance[status]}
                                                        </button>
                                                    ))}
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                            {attendance.length > 0 && (
                                <CardFooter>
                                    <Button
                                        loading={attendanceForm.processing}
                                        onClick={() => attendanceForm.put(route('sessions.attendance', session.id), { preserveScroll: true })}
                                    >
                                        <ClipboardCheck />
                                        {t('Save attendance')}
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    )}

                    <Card>
                        <CardHeader
                            title={t('Recitations in this session')}
                            icon={BookOpenCheck}
                            actions={
                                can.manage &&
                                students.length > 0 && (
                                    <Button size="sm" onClick={() => setRecordOpen(true)}>
                                        <Plus />
                                        {t('Record a recitation')}
                                    </Button>
                                )
                            }
                        />
                        <RecordList records={records} showStudent={can.manage} showHalaqa={false} onEdit={setEditingRecord} />
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader title={t('Meeting')} icon={Video} />
                        <CardBody className="space-y-4 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted">{t('Platform')}</span>
                                <span className="font-semibold text-ink">{labels.provider[session.meeting_provider]}</span>
                            </div>
                            {myAttendance && (
                                <div className="flex items-center justify-between">
                                    <span className="text-muted">{t('My attendance')}</span>
                                    <AttendanceBadge status={myAttendance.status} />
                                </div>
                            )}
                            {session.started_at && (
                                <div className="flex items-center justify-between">
                                    <span className="text-muted">{t('Started at')}</span>
                                    <span className="text-ink">{dates.time(session.started_at)}</span>
                                </div>
                            )}
                            {session.ended_at && (
                                <div className="flex items-center justify-between">
                                    <span className="text-muted">{t('Ended at')}</span>
                                    <span className="text-ink">{dates.time(session.ended_at)}</span>
                                </div>
                            )}
                            {session.meeting_url && (
                                <div className="flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-2">
                                    <span className="truncate text-xs text-muted" dir="ltr">
                                        {session.meeting_url}
                                    </span>
                                    <button type="button" onClick={() => copy(session.meeting_url ?? '')} className="ms-auto text-primary-700 dark:text-primary-300">
                                        <Copy className="size-4" />
                                    </button>
                                </div>
                            )}
                            {session.meeting_password && (
                                <div className="flex items-center justify-between">
                                    <span className="inline-flex items-center gap-1.5 text-muted">
                                        <KeyRound className="size-4" />
                                        {t('Passcode')}
                                    </span>
                                    <span className="font-mono text-ink" dir="ltr">
                                        {session.meeting_password}
                                    </span>
                                </div>
                            )}
                            {can.manage && !session.meeting_configured && open && (
                                <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                                    <TriangleAlert className="size-4 shrink-0" />
                                    {t('This meeting platform is not set up yet. Check the settings page.')}
                                </p>
                            )}
                            {open && (
                                <p className="flex gap-2 text-xs leading-relaxed text-muted">
                                    <Info className="size-4 shrink-0" />
                                    {can.manage
                                        ? t('Pressing "Start the session" opens the meeting and notifies the students.')
                                        : t('Always join from this page so your attendance is recorded.')}
                                </p>
                            )}
                            {can.join && <JoinSessionButton session={session} block />}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title={t('Lesson summary')} icon={FileText} />
                        {can.manage ? (
                            <CardBody className="space-y-4">
                                <Field error={notesForm.errors.notes}>
                                    <Textarea
                                        rows={4}
                                        value={notesForm.data.notes}
                                        onChange={(event) => notesForm.setData('notes', event.target.value)}
                                        placeholder={t('What was covered in this session, homework for next time...')}
                                    />
                                </Field>
                                <Field label={t('Recording link')} error={notesForm.errors.recording_url}>
                                    <Input
                                        dir="ltr"
                                        value={notesForm.data.recording_url}
                                        onChange={(event) => notesForm.setData('recording_url', event.target.value)}
                                        placeholder="https://"
                                    />
                                </Field>
                                <Button
                                    variant="secondary"
                                    className="w-full"
                                    loading={notesForm.processing}
                                    onClick={() => notesForm.put(route('sessions.notes', session.id), { preserveScroll: true })}
                                >
                                    {t('Save')}
                                </Button>
                            </CardBody>
                        ) : (
                            <CardBody className="space-y-3 text-sm">
                                <p className="whitespace-pre-line leading-relaxed text-ink/85">{session.notes || t('No summary yet.')}</p>
                            </CardBody>
                        )}
                        {session.recording_url && (
                            <CardFooter className="justify-start">
                                <a
                                    href={session.recording_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-300"
                                >
                                    <ExternalLink className="size-4" />
                                    {t('Watch the recording')}
                                </a>
                                {session.recording_passcode && (
                                    <span className="text-xs text-muted" dir="ltr">
                                        ({session.recording_passcode})
                                    </span>
                                )}
                            </CardFooter>
                        )}
                    </Card>

                    {session.created_by && (
                        <p className="px-1 text-xs text-muted">{t('Scheduled by :name', { name: session.created_by })}</p>
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={cancelOpen}
                onClose={() => setCancelOpen(false)}
                onConfirm={() =>
                    cancelForm.post(route('sessions.cancel', session.id), {
                        preserveScroll: true,
                        onSuccess: () => setCancelOpen(false),
                    })
                }
                processing={cancelForm.processing}
                title={t('Cancel this session?')}
                message={t('The students will be notified of the cancellation.')}
                confirmLabel={t('Cancel session')}
            >
                <Field label={t('Reason (optional)')} error={cancelForm.errors.reason}>
                    <Input value={cancelForm.data.reason} onChange={(event) => cancelForm.setData('reason', event.target.value)} />
                </Field>
            </ConfirmDialog>

            <ConfirmDialog
                open={endOpen}
                onClose={() => setEndOpen(false)}
                onConfirm={() => router.post(route('sessions.end', session.id), {}, { preserveScroll: true, onFinish: () => setEndOpen(false) })}
                title={t('End the session now?')}
                message={t('Students who did not join will be marked absent. You can still edit the attendance afterwards.')}
                confirmLabel={t('End the session')}
                variant="primary"
            />

            <ConfirmDialog
                open={deleteOpen}
                onClose={() => setDeleteOpen(false)}
                onConfirm={() => router.delete(route('sessions.destroy', session.id))}
                title={t('Delete this session?')}
                message={t('Its attendance will be deleted. To skip a scheduled session, cancel it instead so it is not created again.')}
                confirmLabel={t('Delete')}
            />

            <RecordForm
                open={recordOpen || editingRecord !== null}
                onClose={() => {
                    setRecordOpen(false);
                    setEditingRecord(null);
                }}
                record={editingRecord}
                students={students}
                halaqat={session.halaqa ? [session.halaqa] : []}
                defaultHalaqaId={session.halaqa?.id}
                sessionId={session.id}
            />
        </AppLayout>
    );
}
