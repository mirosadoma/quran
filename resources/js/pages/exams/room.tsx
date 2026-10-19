import { Head, Link, router, usePage, usePoll } from '@inertiajs/react';
import { JaaSMeeting, JitsiMeeting } from '@jitsi/react-sdk';
import { ArrowRight, BellRing, DoorOpen, ExternalLink, Lock, Mic, Play, Radio, Users } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { LogoMark } from '@/components/brand';
import { ExamEntryStatusBadge } from '@/components/exams/exam-badges';
import { Queue, type QueueAction } from '@/components/exams/queue';
import { ResultChip } from '@/components/exams/result-chip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/modal';
import { Tabs } from '@/components/ui/tabs';
import { useDocumentDirection, useFlashToasts } from '@/hooks/use-app-shell';
import { useRealtime } from '@/hooks/use-realtime';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { unwatchExamDay, watchExamDay } from '@/lib/realtime';
import { playChime, prepareSounds, startAlarmSound } from '@/lib/sounds';
import { cn } from '@/lib/utils';
import type { ExamDayItem, ExamEntryItem, ExamRoomLink } from '@/types';

interface RoomProps {
    day: ExamDayItem;
    viewer: { kind: 'manager' | 'examiner' | 'student'; examiner_id: number | null; name: string };
    rooms: ExamRoomLink[];
    embedded: boolean;
    /** The link token of an outside examiner (their actions go through the guest routes). */
    guestToken: string | null;
}

/**
 * The live exam day: the rooms (main hall, the halls of the examiners and their private
 * rooms) and, next to them, the queues of students with the examiner's buttons.
 */
export default function ExamRoom({ day, viewer, rooms, embedded, guestToken }: RoomProps) {
    const { t, locale } = useTrans();
    const dates = useDates();
    const { realtime, auth } = usePage().props;
    const [closing, setClosing] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [activeRoom, setActiveRoom] = useState<string | null>(null);

    useFlashToasts();
    useDocumentDirection();

    const reload = () => router.reload({ only: ['day', 'rooms'] });

    useRealtime<{ id: number }>('exam', (event) => {
        if (event.id === day.id) {
            reload();
        }
    });

    useEffect(() => {
        if (realtime.enabled && auth.user) {
            watchExamDay(realtime, day.id);

            return () => unwatchExamDay(day.id);
        }

        return undefined;
    }, [realtime, auth.user, day.id]);

    // Without realtime, the room refreshes itself every few seconds (guests too).
    usePoll(5_000, { only: ['day', 'rooms'] }, { autoStart: day.status !== 'closed' && !realtime.enabled });

    const maxScore = day.exam?.max_score ?? 100;
    const entries = day.entries ?? [];
    const examiners = day.examiners ?? [];
    const myEntry = viewer.kind === 'student' ? (day.my_entry ?? entries[0] ?? null) : null;

    const actionUrl = (action: QueueAction, entry: ExamEntryItem): string =>
        guestToken ? route(`exams.guest.${action}`, [guestToken, entry.id]) : route(`exams.entries.${action}`, entry.id);

    const post = (name: string, url: string) => {
        router.post(url, {}, { preserveScroll: true, onStart: () => setBusy(name), onFinish: () => setBusy(null) });
    };

    // The room the viewer should be in right now (students are moved automatically).
    const suggestedRoom = useMemo(() => {
        if (viewer.kind === 'student') {
            if (myEntry?.status === 'called') {
                return rooms.find((room) => room.key.startsWith('private-'))?.key ?? null;
            }

            return rooms.find((room) => room.key.startsWith('hall-'))?.key ?? rooms[0]?.key ?? null;
        }

        if (viewer.kind === 'examiner') {
            return day.phase === 'opening' ? 'main' : (rooms.find((room) => room.key.startsWith('hall-'))?.key ?? null);
        }

        return 'main';
    }, [viewer.kind, myEntry?.status, rooms, day.phase]);

    useEffect(() => {
        if (viewer.kind === 'student' || activeRoom === null) {
            setActiveRoom(suggestedRoom);
        }
    }, [suggestedRoom, viewer.kind, activeRoom]);

    const current = rooms.find((room) => room.key === activeRoom) ?? rooms[0] ?? null;

    return (
        <div className="flex min-h-dvh flex-col bg-canvas">
            <Head title={day.exam?.title ?? t('Exam')} />
            <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-primary-950 px-4 text-white">
                {auth.user ? (
                    <Link href={route('exams.show', day.exam_id)} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label={t('Back')}>
                        <ArrowRight className="size-5 ltr:rotate-180" />
                    </Link>
                ) : (
                    <span className="p-1.5" />
                )}
                <LogoMark className="size-8" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{day.exam?.title}</p>
                    <p className="flex items-center gap-2 truncate text-xs text-white/60">
                        {dates.dateTime(day.starts_at)}
                        <span className="text-white/30">·</span>
                        {viewer.name}
                    </p>
                </div>
                {day.status === 'live' ? (
                    <Badge tone={day.phase === 'opening' ? 'gold' : 'emerald'} dot pulse>
                        {day.phase === 'opening' ? t('Opening word') : t('Examining')}
                    </Badge>
                ) : (
                    <Badge tone={day.status === 'closed' ? 'slate' : 'sky'}>{day.status === 'closed' ? t('Closed') : t('Not open yet')}</Badge>
                )}
                {viewer.kind === 'manager' && day.status === 'scheduled' && (
                    <Button variant="gold" size="sm" loading={busy === 'open'} onClick={() => post('open', route('exams.days.open', day.id))}>
                        <Play />
                        {t('Open the day')}
                    </Button>
                )}
                {viewer.kind === 'manager' && day.status === 'live' && day.phase === 'opening' && (
                    <Button variant="success" size="sm" loading={busy === 'examining'} onClick={() => post('examining', route('exams.days.start-examining', day.id))}>
                        <Users />
                        {t('Start the examining')}
                    </Button>
                )}
                {viewer.kind === 'manager' && day.status === 'live' && (
                    <Button variant="danger" size="sm" onClick={() => setClosing(true)}>
                        <Lock />
                        {t('Close the day')}
                    </Button>
                )}
            </header>

            <div className="grid flex-1 gap-4 p-4 lg:grid-cols-5 lg:p-6">
                <section className="flex min-h-96 flex-col gap-4 lg:col-span-3">
                    {viewer.kind === 'student' && myEntry && <StudentStatus entry={myEntry} day={day} maxScore={maxScore} privateRoom={rooms.find((room) => room.key.startsWith('private-')) ?? null} />}

                    {rooms.length > 1 && viewer.kind !== 'student' && (
                        <Tabs
                            value={current?.key ?? ''}
                            onChange={(key) => setActiveRoom(key)}
                            items={rooms.map((room) => ({ value: room.key, label: room.label, icon: room.key.startsWith('private-') ? Mic : room.key === 'main' ? Users : DoorOpen }))}
                        />
                    )}

                    {current === null ? (
                        <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-line p-8 text-center text-sm text-muted">
                            {day.status === 'closed' ? t('This exam day is closed.') : t('The rooms open when the day starts.')}
                        </div>
                    ) : embedded && current.target.type === 'embed' ? (
                        <EmbeddedRoom key={current.key} room={current} subject={`${day.exam?.title ?? ''} · ${current.label}`} moderator={viewer.kind !== 'student'} locale={locale} name={viewer.name} email={auth.user?.email ?? ''} />
                    ) : (
                        <RoomLinks rooms={viewer.kind === 'student' ? rooms : current ? [current] : []} highlight={viewer.kind === 'student' ? suggestedRoom : null} />
                    )}
                </section>

                <aside className="space-y-4 lg:col-span-2">
                    {viewer.kind === 'manager' ? (
                        <ManagerQueues day={day} examiners={examiners} entries={entries} maxScore={maxScore} actionUrl={actionUrl} />
                    ) : viewer.kind === 'examiner' ? (
                        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                                <h2 className="font-bold text-ink">{t('My students')}</h2>
                                <span className="text-xs text-muted">{t(':count students', { count: entries.filter((entry) => entry.examiner_id === viewer.examiner_id).length })}</span>
                            </div>
                            <Queue entries={entries.filter((entry) => entry.examiner_id === viewer.examiner_id)} maxScore={maxScore} actionUrl={actionUrl} canAct={day.status === 'live'} />
                            {day.phase === 'opening' && day.status === 'live' && (
                                <p className="border-t border-line bg-gold-50 px-4 py-2.5 text-xs text-gold-900 dark:bg-gold-500/10 dark:text-gold-100">
                                    {t('The opening word is on in the main hall. The manager will start the examining, then your students come to your hall.')}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
                            <div className="border-b border-line px-4 py-3">
                                <h2 className="font-bold text-ink">{t('The queue of your examiner')}</h2>
                                <p className="text-xs text-muted">{myEntry?.examiner?.name ?? t('Not assigned yet')}</p>
                            </div>
                            <StudentQueue entries={entries} myEntry={myEntry} />
                        </div>
                    )}
                </aside>
            </div>

            <ConfirmDialog
                open={closing}
                onClose={() => setClosing(false)}
                onConfirm={() => {
                    setClosing(false);
                    post('close', route('exams.days.close', day.id));
                }}
                title={t('Close this exam day?')}
                message={t('The rooms close for everyone. Students who were not examined are marked absent; you can still record their results.')}
                confirmLabel={t('Close the day')}
            />
        </div>
    );
}

/**
 * The rooms as buttons that open them in a new tab (the public Jitsi server).
 */
function RoomLinks({ rooms, highlight }: { rooms: ExamRoomLink[]; highlight: string | null }) {
    const { t } = useTrans();

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {rooms.map((room) => {
                const isPrivate = room.key.startsWith('private-');
                const highlighted = room.key === highlight;

                return (
                    <div
                        key={room.key}
                        className={cn(
                            'flex flex-col gap-3 rounded-2xl border p-5 transition',
                            highlighted ? 'border-primary-500 bg-primary-50/60 ring-4 ring-primary-500/15 dark:bg-primary-500/10' : 'border-line bg-surface',
                            isPrivate && highlighted && 'border-rose-500 bg-rose-50/70 ring-rose-500/15 dark:bg-rose-500/10',
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl', isPrivate ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300')}>
                                {isPrivate ? <Mic className="size-5" /> : room.key === 'main' ? <Users className="size-5" /> : <DoorOpen className="size-5" />}
                            </span>
                            <div className="min-w-0">
                                <p className="font-bold text-ink">{room.label}</p>
                                <p className="text-xs text-muted">{isPrivate ? t('One student with the examiner') : room.key === 'main' ? t('Everyone, for the opening word') : t('Students waiting for their turn')}</p>
                            </div>
                        </div>
                        {room.target.url && (
                            <a
                                href={room.target.url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={prepareSounds}
                                className={cn(
                                    'inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition',
                                    isPrivate ? 'bg-rose-600 hover:bg-rose-700' : 'bg-primary-700 hover:bg-primary-800',
                                )}
                            >
                                <ExternalLink className="size-4" />
                                {t('Open the room in a new tab')}
                            </a>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/**
 * A room inside the platform (JaaS or a self-hosted Jitsi server).
 */
function EmbeddedRoom({ room, subject, moderator, locale, name, email }: { room: ExamRoomLink; subject: string; moderator: boolean; locale: string; name: string; email: string }) {
    const embed = room.target.embed as { provider: 'jaas' | 'jitsi'; appId?: string; domain?: string; roomName: string; jwt?: string | null };

    const shared = {
        roomName: embed.roomName,
        jwt: embed.jwt ?? undefined,
        lang: locale,
        userInfo: { displayName: name, email },
        configOverwrite: {
            startWithAudioMuted: !moderator,
            startWithVideoMuted: false,
            prejoinConfig: { enabled: false },
            disableDeepLinking: true,
            defaultLanguage: locale,
            subject,
        },
        interfaceConfigOverwrite: { SHOW_JITSI_WATERMARK: false, MOBILE_APP_PROMO: false },
        getIFrameRef: (node: HTMLDivElement) => {
            node.style.height = '100%';
            node.style.width = '100%';
        },
    };

    return (
        <div className="min-h-[60vh] flex-1 overflow-hidden rounded-3xl bg-primary-950">
            {embed.provider === 'jaas' ? <JaaSMeeting appId={embed.appId ?? ''} {...shared} /> : <JitsiMeeting domain={embed.domain} {...shared} />}
        </div>
    );
}

/**
 * Where the student stands: waiting, told to get ready, or called in (with a bell).
 */
function StudentStatus({ entry, day, maxScore, privateRoom }: { entry: ExamEntryItem; day: ExamDayItem; maxScore: number; privateRoom: ExamRoomLink | null }) {
    const { t } = useTrans();
    const previous = useRef(entry.status);

    useEffect(() => {
        if (previous.current !== entry.status) {
            if (entry.status === 'alerted') {
                playChime();
                navigator.vibrate?.([200, 100, 200]);
            }

            if (entry.status === 'called') {
                const stop = startAlarmSound();
                navigator.vibrate?.([400, 150, 400, 150, 400]);
                const timer = window.setTimeout(stop, 6000);

                previous.current = entry.status;

                return () => {
                    window.clearTimeout(timer);
                    stop();
                };
            }
        }

        previous.current = entry.status;

        return undefined;
    }, [entry.status]);

    const content = (() => {
        if (day.status === 'closed') {
            return { tone: 'slate', icon: Lock, title: t('The exam day is closed'), text: t('Your result will reach you once your academy sends it.') };
        }

        if (entry.status === 'called') {
            return { tone: 'rose', icon: Mic, title: t('It is your turn now!'), text: t('Enter the private room of :name and recite. May Allah grant you success.', { name: entry.examiner?.name ?? t('your examiner') }) };
        }

        if (entry.status === 'alerted') {
            return { tone: 'gold', icon: BellRing, title: t('Get ready, your turn is next'), text: t('Stay in the hall with your microphone ready. You will be called in a moment.') };
        }

        if (entry.status === 'examined') {
            return { tone: 'emerald', icon: Radio, title: t('You have been examined'), text: t('You can leave the exam. Your result will reach you once your academy sends it.') };
        }

        if (day.phase === 'opening') {
            return { tone: 'sky', icon: Users, title: t('Opening word'), text: t('Enter the main hall and listen to the opening word. Then you will be sent to the hall of your examiner.') };
        }

        return { tone: 'sky', icon: DoorOpen, title: t('Waiting for your turn'), text: t('Enter the hall of :name and wait. You are number :position.', { name: entry.examiner?.name ?? t('your examiner'), position: entry.position }) };
    })();

    const tones: Record<string, string> = {
        rose: 'border-rose-400 bg-rose-50 text-rose-950 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-50 animate-pulse',
        gold: 'border-gold-400 bg-gold-50 text-gold-950 dark:border-gold-500/40 dark:bg-gold-500/10 dark:text-gold-50',
        emerald: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-50',
        sky: 'border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-50',
        slate: 'border-line bg-surface-muted text-ink',
    };

    return (
        <div className={cn('flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4', tones[content.tone])}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/60 dark:bg-white/10">
                <content.icon className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="text-lg font-bold">{content.title}</p>
                <p className="text-sm opacity-85">{content.text}</p>
                {entry.status === 'examined' && entry.published_at && <ResultChip entry={entry} maxScore={maxScore} className="mt-2" />}
            </div>
            {entry.status === 'called' && privateRoom?.target.url && (
                <a href={privateRoom.target.url} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl bg-rose-600 px-6 text-base font-bold text-white hover:bg-rose-700">
                    <Mic className="size-5" />
                    {t('Enter the private room')}
                </a>
            )}
        </div>
    );
}

/**
 * The queue of the student's examiner, names only.
 */
function StudentQueue({ entries, myEntry }: { entries: ExamEntryItem[]; myEntry: ExamEntryItem | null }) {
    const { t } = useTrans();

    if (!myEntry) {
        return <p className="px-4 py-6 text-center text-sm text-muted">{t('You are not examined on this day.')}</p>;
    }

    const ahead = entries.filter((entry) => entry.examiner_id === myEntry.examiner_id && entry.position < myEntry.position && (entry.status === 'waiting' || entry.status === 'alerted' || entry.status === 'called')).length;

    return (
        <div className="px-4 py-4">
            <p className="text-sm text-ink">
                {ahead === 0 ? t('Nobody is ahead of you.') : t(':count students are ahead of you.', { count: ahead })}
            </p>
            <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                {t('Your status')}: <ExamEntryStatusBadge status={myEntry.status} />
            </p>
        </div>
    );
}

/**
 * The manager sees the queue of every examiner and may act on any student.
 */
function ManagerQueues({ day, examiners, entries, maxScore, actionUrl }: { day: ExamDayItem; examiners: ExamDayItem['examiners'] & object; entries: ExamEntryItem[]; maxScore: number; actionUrl: (action: QueueAction, entry: ExamEntryItem) => string }) {
    const { t } = useTrans();
    const [selected, setSelected] = useState<string>(examiners[0] ? String(examiners[0].id) : 'none');
    const unassigned = entries.filter((entry) => entry.examiner_id === null);
    const list = selected === 'none' ? unassigned : entries.filter((entry) => String(entry.examiner_id) === selected);

    return (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="border-b border-line px-4 py-3">
                <h2 className="font-bold text-ink">{t('Queues')}</h2>
                <Tabs
                    className="mt-2"
                    value={selected}
                    onChange={setSelected}
                    items={[
                        ...examiners.map((examiner) => ({
                            value: String(examiner.id),
                            label: examiner.name,
                            count: entries.filter((entry) => entry.examiner_id === examiner.id && (entry.status === 'waiting' || entry.status === 'alerted' || entry.status === 'called')).length,
                        })),
                        ...(unassigned.length > 0 ? [{ value: 'none', label: t('Not assigned yet'), count: unassigned.length }] : []),
                    ]}
                />
            </div>
            <Queue entries={list} maxScore={maxScore} actionUrl={actionUrl} canAct={day.status === 'live'} compact />
        </div>
    );
}
