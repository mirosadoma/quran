import { router, useForm } from '@inertiajs/react';
import { BookHeart, CalendarClock, CalendarDays, Clock, Lightbulb, MessageSquareQuote, Pencil, Quote, Send, Trash } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field, Input, Textarea } from '@/components/ui/form';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import type { Tone } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { AnnouncementDelivery, AnnouncementItem, AnnouncementKind } from '@/types';

export interface AnnouncementSession {
    id: number;
    title: string;
    starts_at: string;
    status: string;
    extra: boolean;
}

const kinds: AnnouncementKind[] = ['advice', 'word', 'hadith', 'reminder'];

const kindTone: Record<AnnouncementKind, Tone> = {
    advice: 'emerald',
    word: 'sky',
    hadith: 'gold',
    reminder: 'violet',
};

const kindIcon = {
    advice: Lightbulb,
    word: MessageSquareQuote,
    hadith: BookHeart,
    reminder: CalendarClock,
} as const;

export function useKindLabels(): Record<AnnouncementKind, string> {
    const { t } = useTrans();

    return { advice: t('Advice'), word: t('A word'), hadith: t('Hadith'), reminder: t('Reminder') };
}

interface AnnouncementListProps {
    announcements: AnnouncementItem[];
    onEdit?: (announcement: AnnouncementItem) => void;
    showHalaqa?: boolean;
    compact?: boolean;
}

/**
 * Messages of the teacher to the students of the halaqa, newest first
 * (the teacher also sees those still waiting to be delivered).
 */
export function AnnouncementList({ announcements, onEdit, showHalaqa = false, compact = false }: AnnouncementListProps) {
    const { t } = useTrans();
    const dates = useDates();
    const labels = useKindLabels();
    const [deleting, setDeleting] = useState<AnnouncementItem | null>(null);

    if (announcements.length === 0) {
        return <EmptyState icon={MessageSquareQuote} title={t('No messages yet')} description={t('Advice, hadiths and reminders from the teacher appear here.')} compact />;
    }

    return (
        <>
            <ul className="divide-y divide-line">
                {announcements.map((announcement) => {
                    const Icon = kindIcon[announcement.kind];
                    const pending = announcement.sent_at === null;

                    return (
                        <li key={announcement.id} className={cn('flex gap-4 px-5 py-5 sm:px-6', pending && 'bg-surface-muted/50')}>
                            <span
                                className={cn(
                                    'flex size-10 shrink-0 items-center justify-center rounded-2xl',
                                    {
                                        advice: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10',
                                        word: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10',
                                        hadith: 'bg-gold-50 text-gold-600 dark:bg-gold-500/10',
                                        reminder: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10',
                                    }[announcement.kind],
                                )}
                            >
                                <Icon className="size-4.5" />
                            </span>

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge tone={kindTone[announcement.kind]}>{labels[announcement.kind]}</Badge>
                                    {announcement.title && <h3 className="font-bold text-ink">{announcement.title}</h3>}
                                    {showHalaqa && announcement.halaqa && <span className="text-xs text-muted">· {announcement.halaqa.name}</span>}
                                    {pending && <PendingBadge announcement={announcement} />}
                                </div>

                                <div
                                    dir="auto"
                                    className={cn(
                                        'mt-2 leading-relaxed whitespace-pre-line text-ink/90',
                                        announcement.kind === 'hadith' && 'rounded-2xl border-s-2 border-gold-400 bg-gold-50/60 px-4 py-3 font-quran text-lg dark:bg-gold-500/10',
                                        compact && 'line-clamp-3',
                                    )}
                                >
                                    {announcement.kind === 'hadith' && <Quote className="mb-1 size-4 text-gold-500" />}
                                    {announcement.body}
                                </div>

                                {announcement.sessions && announcement.sessions.length > 0 && pending && (
                                    <ul className="mt-3 flex flex-wrap gap-1.5">
                                        {announcement.sessions.map((session) => (
                                            <li
                                                key={session.id}
                                                className={cn(
                                                    'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs ring-1',
                                                    session.cancelled ? 'text-muted line-through ring-line' : session.sent_at ? 'text-emerald-700 ring-emerald-200 dark:text-emerald-300' : 'text-ink ring-line',
                                                )}
                                            >
                                                <CalendarDays className="size-3" />
                                                {dates.dateTime(session.starts_at)}
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                                    {announcement.author && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Avatar name={announcement.author.name} src={announcement.author.avatar_url} size="xs" />
                                            {announcement.author.name}
                                        </span>
                                    )}
                                    {announcement.sent_at && (
                                        <span className="inline-flex items-center gap-1" title={dates.dateTime(announcement.sent_at)}>
                                            <Clock className="size-3.5" />
                                            {dates.relative(announcement.sent_at)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {(announcement.can.update || announcement.can.delete) && (
                                <div className="flex shrink-0 items-start gap-1">
                                    {announcement.can.update && onEdit && (
                                        <Button variant="ghost" size="icon-sm" onClick={() => onEdit(announcement)} aria-label={t('Edit')}>
                                            <Pencil />
                                        </Button>
                                    )}
                                    {announcement.can.delete && (
                                        <Button variant="ghost" size="icon-sm" className="hover:text-rose-600" onClick={() => setDeleting(announcement)} aria-label={t('Delete')}>
                                            <Trash />
                                        </Button>
                                    )}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>

            <ConfirmDialog
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={() =>
                    deleting &&
                    router.delete(route('announcements.destroy', deleting.id), {
                        preserveScroll: true,
                        onFinish: () => setDeleting(null),
                    })
                }
                title={t('Delete this message?')}
                message={t('It disappears from the halaqa page. Notifications already sent stay with the students.')}
                confirmLabel={t('Delete')}
            />
        </>
    );
}

function PendingBadge({ announcement }: { announcement: AnnouncementItem }) {
    const { t } = useTrans();
    const dates = useDates();

    if (announcement.delivery === 'scheduled' && announcement.scheduled_at) {
        return (
            <Badge tone="amber">
                <CalendarClock className="size-3" />
                {t('Scheduled: :time', { time: dates.dateTime(announcement.scheduled_at) })}
            </Badge>
        );
    }

    return (
        <Badge tone="amber">
            <CalendarDays className="size-3" />
            {t('Sent when the session starts')}
        </Badge>
    );
}

interface AnnouncementFormProps {
    open: boolean;
    onClose: () => void;
    halaqaId: number;
    announcement: AnnouncementItem | null;
    sessions: AnnouncementSession[];
}

interface AnnouncementFormData {
    kind: AnnouncementKind;
    title: string;
    body: string;
    delivery: AnnouncementDelivery;
    date: string;
    time: string;
    session_ids: number[];
}

/**
 * Write a message to all the students of the halaqa: send it now, at a chosen
 * time, or when one or more of the coming sessions start.
 */
export function AnnouncementForm({ open, onClose, halaqaId, announcement, sessions }: AnnouncementFormProps) {
    const { t } = useTrans();
    const dates = useDates();
    const labels = useKindLabels();

    const form = useForm<AnnouncementFormData>({ kind: 'advice', title: '', body: '', delivery: 'now', date: '', time: '', session_ids: [] });

    useEffect(() => {
        if (!open) {
            return;
        }

        const inAnHour = new Date(Date.now() + 60 * 60 * 1000);
        const scheduled = announcement?.scheduled_at ? new Date(announcement.scheduled_at) : inAnHour;

        form.clearErrors();
        form.setData({
            kind: announcement?.kind ?? 'advice',
            title: announcement?.title ?? '',
            body: announcement?.body ?? '',
            delivery: announcement?.delivery ?? 'now',
            date: dates.dayKey(scheduled),
            time: new Intl.DateTimeFormat('en-GB', { timeZone: dates.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(scheduled),
            session_ids: announcement?.sessions?.map((session) => session.id) ?? [],
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, announcement?.id]);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => onClose() };

        if (announcement) {
            form.put(route('announcements.update', announcement.id), options);
        } else {
            form.post(route('halaqat.announcements.store', halaqaId), options);
        }
    };

    const toggleSession = (id: number) =>
        form.setData('session_ids', form.data.session_ids.includes(id) ? form.data.session_ids.filter((value) => value !== id) : [...form.data.session_ids, id]);

    const deliveryOptions: { value: AnnouncementDelivery; label: string; hint: string; icon: typeof Send }[] = [
        { value: 'now', label: t('Send now'), hint: t('The students receive it right away'), icon: Send },
        { value: 'scheduled', label: t('At a time'), hint: t('Choose the day and the hour'), icon: CalendarClock },
        { value: 'sessions', label: t('With sessions'), hint: t('When each chosen session starts'), icon: CalendarDays },
    ];

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="lg"
            title={announcement ? t('Edit the message') : t('New message to the students')}
            description={t('Every student of the halaqa receives it as a notification, and it stays in the messages tab.')}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" form="announcement-form" loading={form.processing}>
                        <Send />
                        {form.data.delivery === 'now' ? t('Send') : t('Schedule')}
                    </Button>
                </>
            }
        >
            <form id="announcement-form" onSubmit={submit} className="space-y-5">
                <Field label={t('Type')} error={form.errors.kind}>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {kinds.map((kind) => {
                            const Icon = kindIcon[kind];

                            return (
                                <button
                                    key={kind}
                                    type="button"
                                    onClick={() => form.setData('kind', kind)}
                                    className={cn(
                                        'flex items-center justify-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition',
                                        form.data.kind === kind
                                            ? 'border-primary-600 bg-primary-50 text-primary-800 dark:bg-primary-500/10 dark:text-primary-200'
                                            : 'border-line text-muted hover:border-line-strong',
                                    )}
                                >
                                    <Icon className="size-4" />
                                    {labels[kind]}
                                </button>
                            );
                        })}
                    </div>
                </Field>

                <Field label={t('Title')} error={form.errors.title} hint={t('Optional')}>
                    <Input value={form.data.title} onChange={(event) => form.setData('title', event.target.value)} maxLength={150} />
                </Field>

                <Field label={t('Message')} error={form.errors.body} required>
                    <Textarea
                        dir="auto"
                        rows={5}
                        value={form.data.body}
                        onChange={(event) => form.setData('body', event.target.value)}
                        placeholder={form.data.kind === 'hadith' ? t('Write the hadith and its source') : t('Write your message to the students')}
                    />
                </Field>

                <Field label={t('When to send')} error={form.errors.delivery}>
                    <div className="grid gap-2 sm:grid-cols-3">
                        {deliveryOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => form.setData('delivery', option.value)}
                                className={cn(
                                    'flex items-start gap-3 rounded-2xl border px-3 py-3 text-start transition',
                                    form.data.delivery === option.value ? 'border-primary-600 bg-primary-50/70 dark:bg-primary-500/10' : 'border-line hover:border-line-strong',
                                )}
                            >
                                <option.icon className={cn('mt-0.5 size-4 shrink-0', form.data.delivery === option.value ? 'text-primary-600' : 'text-muted')} />
                                <span>
                                    <span className="block text-sm font-semibold text-ink">{option.label}</span>
                                    <span className="block text-xs text-muted">{option.hint}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </Field>

                {form.data.delivery === 'scheduled' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label={t('Date')} error={form.errors.date} required>
                            <Input type="date" value={form.data.date} onChange={(event) => form.setData('date', event.target.value)} />
                        </Field>
                        <Field label={t('Time')} error={form.errors.time} required hint={t('In your timezone')}>
                            <Input type="time" value={form.data.time} onChange={(event) => form.setData('time', event.target.value)} />
                        </Field>
                    </div>
                )}

                {form.data.delivery === 'sessions' && (
                    <Field label={t('Sessions')} error={form.errors.session_ids ?? (form.errors as Record<string, string | undefined>)['session_ids.0']} required>
                        {sessions.length === 0 ? (
                            <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm text-muted">{t('No upcoming sessions. Create an extra session first.')}</p>
                        ) : (
                            <ul className="max-h-64 space-y-1.5 overflow-y-auto">
                                {sessions.map((session) => {
                                    const checked = form.data.session_ids.includes(session.id);

                                    return (
                                        <li key={session.id}>
                                            <label
                                                className={cn(
                                                    'flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition',
                                                    checked ? 'border-primary-500 bg-primary-50/60 dark:bg-primary-500/10' : 'border-line hover:border-line-strong',
                                                )}
                                            >
                                                <input type="checkbox" className="size-4 accent-primary-600" checked={checked} onChange={() => toggleSession(session.id)} />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-semibold text-ink">{dates.dateTime(session.starts_at)}</span>
                                                    <span className="block truncate text-xs text-muted">{session.title}</span>
                                                </span>
                                                {session.status === 'live' && <Badge tone="emerald">{t('Live now')}</Badge>}
                                                {session.extra && <Badge tone="violet">{t('Extra session')}</Badge>}
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Field>
                )}
            </form>
        </Modal>
    );
}
