import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, FileText, Image as ImageIcon, MessagesSquare, Mic, Paperclip, Send, Square, Trash, Users, X } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Avatar } from '@/components/ui/avatar';
import { Button, Spinner } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/modal';
import { useRealtime } from '@/hooks/use-realtime';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { http } from '@/lib/http';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { joinPresence, leavePresence, watchHalaqa } from '@/lib/realtime';
import { cn, colorOf, formatBytes } from '@/lib/utils';
import type { ChatMessage, ChatUser, Conversation } from '@/types';

interface ChatProps {
    conversations: Conversation[];
    conversation: { id: number; name: string; color: string; teacher: string | null; members_count: number } | null;
    messages: ChatMessage[];
    hasMore: boolean;
    members: ChatUser[];
    canModerate: boolean;
}

export default function Chat({ conversations, conversation, messages, hasMore, members, canModerate }: ChatProps) {
    const { t } = useTrans();

    return (
        <AppLayout title={conversation ? conversation.name : t('Chat')} hideHeader flush wide>
            <div className="flex h-[calc(100dvh-6.5rem)] overflow-hidden rounded-3xl border border-line bg-surface lg:h-[calc(100dvh-7.5rem)]">
                <aside className={cn('w-full shrink-0 border-line lg:block lg:w-80 lg:border-e', conversation ? 'hidden' : 'block')}>
                    <ConversationList conversations={conversations} activeId={conversation?.id ?? null} />
                </aside>
                <section className={cn('min-w-0 flex-1 flex-col', conversation ? 'flex' : 'hidden lg:flex')}>
                    {conversation ? (
                        <Thread
                            key={conversation.id}
                            conversation={conversation}
                            initialMessages={messages}
                            initialHasMore={hasMore}
                            members={members}
                            canModerate={canModerate}
                        />
                    ) : (
                        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
                            <span className="flex size-16 items-center justify-center rounded-3xl bg-primary-50 text-primary-600 dark:bg-primary-500/10">
                                <MessagesSquare className="size-7" />
                            </span>
                            <p className="mt-4 font-bold text-ink">{t('Choose a conversation')}</p>
                            <p className="mt-1 max-w-xs text-sm text-muted">{t('Every halaqa has a group chat for the teacher and the students.')}</p>
                        </div>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}

function ConversationList({ conversations, activeId }: { conversations: Conversation[]; activeId: number | null }) {
    const { t } = useTrans();
    const dates = useDates();

    return (
        <div className="flex h-full flex-col">
            <div className="border-b border-line px-5 py-4">
                <h1 className="text-lg font-bold text-ink">{t('Chat')}</h1>
                <p className="text-xs text-muted">{t('Halaqa group conversations')}</p>
            </div>
            <ul className="flex-1 overflow-y-auto p-2">
                {conversations.length === 0 && <li className="px-4 py-10 text-center text-sm text-muted">{t('You are not in any halaqa yet.')}</li>}
                {conversations.map((item) => {
                    const color = colorOf(item.color);

                    return (
                        <li key={item.id}>
                            <Link
                                href={route('chat.show', item.id)}
                                className={cn(
                                    'flex items-center gap-3 rounded-2xl px-3 py-3 transition',
                                    item.id === activeId ? 'bg-primary-50 dark:bg-primary-500/10' : 'hover:bg-surface-muted',
                                )}
                            >
                                <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-2xl text-white', color.dot)}>
                                    <Users className="size-5" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center justify-between gap-2">
                                        <span className="truncate text-sm font-semibold text-ink">{item.name}</span>
                                        {item.last_message && (
                                            <span className="shrink-0 text-[11px] text-muted">{dates.relative(item.last_message.created_at)}</span>
                                        )}
                                    </span>
                                    <span className="mt-0.5 flex items-center justify-between gap-2">
                                        <span className="truncate text-xs text-muted">
                                            {item.last_message ? (
                                                <>
                                                    {item.last_message.user && <span className="font-medium">{item.last_message.user}: </span>}
                                                    {item.last_message.preview}
                                                </>
                                            ) : (
                                                t('No messages yet')
                                            )}
                                        </span>
                                        {item.unread > 0 && (
                                            <span className="min-w-5 shrink-0 rounded-full bg-gold-500 px-1.5 text-center text-[11px] font-bold leading-5 text-primary-950">
                                                {item.unread}
                                            </span>
                                        )}
                                    </span>
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

interface ThreadProps {
    conversation: NonNullable<ChatProps['conversation']>;
    initialMessages: ChatMessage[];
    initialHasMore: boolean;
    members: ChatUser[];
    canModerate: boolean;
}

function Thread({ conversation, initialMessages, initialHasMore, members, canModerate }: ThreadProps) {
    const { t } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const { auth, realtime } = usePage().props;
    const me = auth.user;

    const [items, setItems] = useState<ChatMessage[]>(initialMessages);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [online, setOnline] = useState<number[]>([]);
    const [typing, setTyping] = useState<{ id: number; name: string } | null>(null);
    const [deleting, setDeleting] = useState<ChatMessage | null>(null);

    const scroller = useRef<HTMLDivElement>(null);
    const stickToBottom = useRef(true);
    const typingTimer = useRef<number>(0);

    const scrollToBottom = useCallback((smooth = false) => {
        const element = scroller.current;

        if (element) {
            element.scrollTo({ top: element.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [scrollToBottom]);

    useEffect(() => {
        if (stickToBottom.current) {
            scrollToBottom(true);
        }
    }, [items.length, scrollToBottom]);

    const append = useCallback((message: ChatMessage) => {
        setItems((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
    }, []);

    const markRead = useCallback(
        (messageId: number) => {
            http.post(route('chat.read', conversation.id), { message_id: messageId }).catch(() => undefined);
        },
        [conversation.id],
    );

    const realtimeRef = useRef(realtime);
    realtimeRef.current = realtime;

    // Realtime: messages, deletions, who is online and who is typing.
    useEffect(() => {
        const config = realtimeRef.current;

        if (!config.enabled) {
            return;
        }

        watchHalaqa(config, conversation.id);
        const channel = joinPresence(config, conversation.id);

        channel
            ?.here((users: ChatUser[]) => setOnline(users.map((user) => user.id)))
            .joining((user: ChatUser) => setOnline((current) => [...new Set([...current, user.id])]))
            .leaving((user: ChatUser) => setOnline((current) => current.filter((id) => id !== user.id)))
            .listenForWhisper('typing', (user: { id: number; name: string }) => {
                setTyping(user);
                window.clearTimeout(typingTimer.current);
                typingTimer.current = window.setTimeout(() => setTyping(null), 3000);
            });

        return () => leavePresence(conversation.id);
    }, [realtime.enabled, conversation.id]);

    useRealtime<ChatMessage>('message', (message) => {
        if (message.halaqa_id === conversation.id) {
            append(message);
            setTyping(null);
            markRead(message.id);
        }
    });

    useRealtime<{ id: number; halaqa_id: number }>('message-deleted', (event) => {
        if (event.halaqa_id === conversation.id) {
            setItems((current) => current.filter((item) => item.id !== event.id));
        }
    });

    // Without realtime: poll for new messages every few seconds.
    const lastId = items[items.length - 1]?.id ?? 0;

    useEffect(() => {
        if (realtime.enabled) {
            return;
        }

        const timer = window.setInterval(() => {
            http.get<{ messages: ChatMessage[] }>(route('chat.messages', conversation.id), { params: { after: lastId } })
                .then(({ data }) => {
                    if (data.messages.length > 0) {
                        data.messages.forEach(append);
                        markRead(data.messages[data.messages.length - 1].id);
                    }
                })
                .catch(() => undefined);
        }, 4000);

        return () => window.clearInterval(timer);
    }, [realtime.enabled, conversation.id, lastId, append, markRead]);

    const loadOlder = () => {
        const element = scroller.current;
        const previousHeight = element?.scrollHeight ?? 0;

        setLoadingOlder(true);
        http.get<{ messages: ChatMessage[]; has_more: boolean }>(route('chat.messages', conversation.id), { params: { before: items[0]?.id } })
            .then(({ data }) => {
                stickToBottom.current = false;
                setItems((current) => [...data.messages, ...current]);
                setHasMore(data.has_more);
                requestAnimationFrame(() => {
                    if (element) {
                        element.scrollTop = element.scrollHeight - previousHeight;
                    }
                });
            })
            .finally(() => setLoadingOlder(false));
    };

    const whisperTyping = useMemo(() => {
        let last = 0;

        return () => {
            if (!realtime.enabled || !me || Date.now() - last < 2000) {
                return;
            }

            last = Date.now();
            joinPresence(realtime, conversation.id)?.whisper('typing', { id: me.id, name: me.name });
        };
    }, [realtime, conversation.id, me]);

    const destroy = () => {
        if (!deleting) {
            return;
        }

        http.delete(route('chat.messages.destroy', deleting.id))
            .then(() => setItems((current) => current.filter((item) => item.id !== deleting.id)))
            .catch(() => toast.error(t('The message could not be deleted.')))
            .finally(() => setDeleting(null));
    };

    const onlineCount = members.filter((member) => online.includes(member.id)).length;

    return (
        <>
            <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
                <Link href={route('chat.index')} className="rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-ink lg:hidden">
                    <ArrowRight className="size-5 ltr:rotate-180" />
                </Link>
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl text-white', colorOf(conversation.color).dot)}>
                    <Users className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <Link href={route('halaqat.show', conversation.id)} className="block truncate font-bold text-ink hover:text-primary-700">
                        {conversation.name}
                    </Link>
                    <p className="truncate text-xs text-muted">
                        {typing ? (
                            <span className="text-primary-600">{t(':name is typing...', { name: typing.name })}</span>
                        ) : (
                            <>
                                {t(':count members', { count: conversation.members_count })}
                                {realtime.enabled && onlineCount > 0 && <> · {t(':count online', { count: onlineCount })}</>}
                            </>
                        )}
                    </p>
                </div>
                <Popover className="relative">
                    <PopoverButton className="rounded-xl p-2 text-muted transition hover:bg-surface-muted hover:text-ink">
                        <Users className="size-5" />
                    </PopoverButton>
                    <PopoverPanel
                        anchor="bottom end"
                        className="z-50 w-64 rounded-2xl border border-line bg-surface p-2 shadow-xl [--anchor-gap:8px]"
                    >
                        <p className="px-2 py-1.5 text-xs font-semibold text-muted">{t('Members')}</p>
                        <ul className="max-h-72 overflow-y-auto">
                            {members.map((member) => (
                                <li key={member.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
                                    <span className="relative">
                                        <Avatar name={member.name} src={member.avatar_url} size="sm" />
                                        {online.includes(member.id) && (
                                            <span className="absolute -bottom-0.5 -end-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-surface" />
                                        )}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{member.name}</span>
                                    {member.role !== 'student' && <span className="text-[11px] font-semibold text-gold-600">{labels.role[member.role]}</span>}
                                </li>
                            ))}
                        </ul>
                    </PopoverPanel>
                </Popover>
            </header>

            <div
                ref={scroller}
                onScroll={(event) => {
                    const element = event.currentTarget;
                    stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
                }}
                className="flex-1 overflow-y-auto bg-surface-muted/50 px-3 py-4 sm:px-6"
            >
                {hasMore && (
                    <div className="mb-4 flex justify-center">
                        <Button variant="secondary" size="xs" onClick={loadOlder} loading={loadingOlder}>
                            {t('Load older messages')}
                        </Button>
                    </div>
                )}
                {items.length === 0 && (
                    <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted">
                        <MessagesSquare className="mb-3 size-8 text-primary-400" />
                        {t('No messages yet. Start the conversation!')}
                    </div>
                )}
                <div className="space-y-1">
                    {items.map((message, index) => {
                        const previous = items[index - 1];
                        const newDay = !previous || dates.dayKey(previous.created_at) !== dates.dayKey(message.created_at);
                        const grouped =
                            !newDay &&
                            previous?.user?.id === message.user?.id &&
                            new Date(message.created_at).getTime() - new Date(previous.created_at).getTime() < 5 * 60_000;

                        return (
                            <div key={message.id}>
                                {newDay && (
                                    <div className="my-4 flex justify-center">
                                        <span className="rounded-full bg-surface px-3 py-1 text-[11px] font-semibold text-muted ring-1 ring-line">
                                            {dates.isToday(message.created_at)
                                                ? t('Today')
                                                : dates.isYesterday(message.created_at)
                                                  ? t('Yesterday')
                                                  : dates.date(message.created_at, { weekday: 'long', month: 'long' })}
                                        </span>
                                    </div>
                                )}
                                <MessageBubble
                                    message={message}
                                    mine={message.user?.id === me?.id}
                                    grouped={grouped}
                                    canDelete={canModerate || message.user?.id === me?.id}
                                    onDelete={() => setDeleting(message)}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            <Composer
                halaqaId={conversation.id}
                onSent={(message) => {
                    stickToBottom.current = true;
                    append(message);
                }}
                onTyping={whisperTyping}
            />

            <ConfirmDialog
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={destroy}
                title={t('Delete this message?')}
                message={t('It will be removed for everyone.')}
                confirmLabel={t('Delete')}
            />
        </>
    );
}

function MessageBubble({
    message,
    mine,
    grouped,
    canDelete,
    onDelete,
}: {
    message: ChatMessage;
    mine: boolean;
    grouped: boolean;
    canDelete: boolean;
    onDelete: () => void;
}) {
    const { t } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const author = message.user;

    return (
        <div className={cn('group flex items-end gap-2', mine ? 'flex-row-reverse' : 'flex-row', grouped ? 'mt-0.5' : 'mt-3')}>
            {!mine && (
                <div className="w-8 shrink-0">{!grouped && author && <Avatar name={author.name} src={author.avatar_url} size="sm" />}</div>
            )}
            <div className={cn('flex max-w-[82%] flex-col sm:max-w-[70%]', mine ? 'items-end' : 'items-start')}>
                {!mine && !grouped && (
                    <p className="mb-1 flex items-center gap-1.5 px-1 text-xs font-semibold text-ink">
                        {author?.name ?? t('Deleted user')}
                        {author && author.role !== 'student' && (
                            <span className="rounded-md bg-gold-50 px-1.5 py-px text-[10px] text-gold-700 dark:bg-gold-500/10 dark:text-gold-300">
                                {labels.role[author.role]}
                            </span>
                        )}
                    </p>
                )}
                <div className="flex items-center gap-1.5">
                    {canDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className={cn('rounded-lg p-1 text-muted opacity-0 transition hover:text-rose-600 group-hover:opacity-100', mine ? 'order-first' : 'order-last')}
                            aria-label={t('Delete')}
                        >
                            <Trash className="size-3.5" />
                        </button>
                    )}
                    <div
                        className={cn(
                            'overflow-hidden rounded-2xl text-sm shadow-xs',
                            mine
                                ? 'rounded-ee-md bg-primary-700 text-white dark:bg-primary-600'
                                : 'rounded-es-md border border-line bg-surface text-ink',
                        )}
                    >
                        {message.attachment && <Attachment message={message} mine={mine} />}
                        {message.body && (
                            <p dir="auto" className="whitespace-pre-wrap break-words px-3.5 py-2 leading-relaxed">
                                {message.body}
                            </p>
                        )}
                    </div>
                </div>
                <span className="mt-0.5 px-1 text-[10px] text-muted">{dates.time(message.created_at)}</span>
            </div>
        </div>
    );
}

function Attachment({ message, mine }: { message: ChatMessage; mine: boolean }) {
    const { t } = useTrans();
    const attachment = message.attachment;

    if (!attachment) {
        return null;
    }

    if (message.type === 'image') {
        return (
            <a href={attachment.url} target="_blank" rel="noreferrer" className="block">
                <img src={attachment.url} alt={attachment.name ?? ''} loading="lazy" className="max-h-72 w-full object-cover" />
            </a>
        );
    }

    if (message.type === 'audio') {
        return (
            <div className="px-2 pt-2">
                <audio controls preload="metadata" src={attachment.url} className="h-10 w-64 max-w-full" />
                <p className={cn('px-1.5 pb-1 text-[11px]', mine ? 'text-white/70' : 'text-muted')}>{t('Voice message')}</p>
            </div>
        );
    }

    return (
        <a
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            className={cn('flex items-center gap-3 px-3.5 py-3', mine ? 'hover:bg-white/10' : 'hover:bg-surface-muted')}
        >
            <span className={cn('flex size-10 items-center justify-center rounded-xl', mine ? 'bg-white/15' : 'bg-primary-50 text-primary-700 dark:bg-primary-500/10')}>
                <FileText className="size-5" />
            </span>
            <span className="min-w-0">
                <span className="block max-w-52 truncate font-medium">{attachment.name ?? t('File')}</span>
                <span className={cn('text-xs', mine ? 'text-white/70' : 'text-muted')}>{formatBytes(attachment.size)}</span>
            </span>
        </a>
    );
}

function Composer({ halaqaId, onSent, onTyping }: { halaqaId: number; onSent: (message: ChatMessage) => void; onTyping: () => void }) {
    const { t } = useTrans();
    const [body, setBody] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [sending, setSending] = useState(false);
    const [recording, setRecording] = useState(false);
    const [seconds, setSeconds] = useState(0);

    const fileInput = useRef<HTMLInputElement>(null);
    const textarea = useRef<HTMLTextAreaElement>(null);
    const recorder = useRef<MediaRecorder | null>(null);
    const chunks = useRef<Blob[]>([]);
    const discard = useRef(false);
    const timer = useRef<number>(0);

    useEffect(() => () => window.clearInterval(timer.current), []);

    const send = async (payload: { body?: string; file?: File | null; kind?: 'audio' }) => {
        const data = new FormData();

        if (payload.body) {
            data.append('body', payload.body);
        }

        if (payload.file) {
            data.append('attachment', payload.file);
        }

        if (payload.kind) {
            data.append('kind', payload.kind);
        }

        setSending(true);

        try {
            const response = await http.post<{ message: ChatMessage }>(route('chat.messages.store', halaqaId), data);
            onSent(response.data.message);

            return true;
        } catch (error: unknown) {
            const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
            toast.error(message ?? t('The message could not be sent.'));

            return false;
        } finally {
            setSending(false);
        }
    };

    const submit = async (event?: FormEvent) => {
        event?.preventDefault();

        if (sending || (!body.trim() && !file)) {
            return;
        }

        const ok = await send({ body: body.trim(), file });

        if (ok) {
            setBody('');
            setFile(null);
            textarea.current?.focus();
        }
    };

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) {
            event.preventDefault();
            void submit();
        }
    };

    const startRecording = async () => {
        if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
            toast.error(t('Voice recording needs a secure (HTTPS) connection and a supported browser.'));

            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'].find((type) => MediaRecorder.isTypeSupported(type));
            const media = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

            chunks.current = [];
            discard.current = false;
            media.ondataavailable = (event) => chunks.current.push(event.data);
            media.onstop = () => {
                stream.getTracks().forEach((track) => track.stop());
                window.clearInterval(timer.current);
                setRecording(false);

                if (discard.current || chunks.current.length === 0) {
                    return;
                }

                const type = media.mimeType || 'audio/webm';
                const extension = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
                const blob = new Blob(chunks.current, { type });
                void send({ file: new File([blob], `voice-${Date.now()}.${extension}`, { type }), kind: 'audio' });
            };

            recorder.current = media;
            media.start();
            setSeconds(0);
            setRecording(true);
            timer.current = window.setInterval(() => {
                setSeconds((value) => {
                    if (value + 1 >= 300) {
                        recorder.current?.stop();
                    }

                    return value + 1;
                });
            }, 1000);
        } catch {
            toast.error(t('Microphone access was denied.'));
        }
    };

    const stopRecording = (cancel: boolean) => {
        discard.current = cancel;
        recorder.current?.stop();
    };

    const clock = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

    return (
        <form onSubmit={submit} className="border-t border-line bg-surface p-3 sm:p-4">
            {file && (
                <div className="mb-2 flex items-center gap-2 rounded-xl bg-surface-muted px-3 py-2 text-sm">
                    {file.type.startsWith('image/') ? <ImageIcon className="size-4 text-primary-600" /> : <FileText className="size-4 text-primary-600" />}
                    <span className="min-w-0 flex-1 truncate text-ink">{file.name}</span>
                    <span className="text-xs text-muted">{formatBytes(file.size)}</span>
                    <button type="button" onClick={() => setFile(null)} className="text-muted hover:text-rose-600">
                        <X className="size-4" />
                    </button>
                </div>
            )}

            {recording ? (
                <div className="flex items-center gap-3 rounded-2xl bg-rose-50 px-4 py-2.5 dark:bg-rose-500/10">
                    <span className="size-2.5 animate-pulse rounded-full bg-rose-500" />
                    <span className="flex-1 text-sm font-semibold text-rose-700 tabular-nums dark:text-rose-300">
                        {t('Recording...')} {clock}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => stopRecording(true)}>
                        {t('Cancel')}
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => stopRecording(false)}>
                        <Square className="fill-current" />
                        {t('Send')}
                    </Button>
                </div>
            ) : (
                <div className="flex items-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => fileInput.current?.click()} aria-label={t('Attach a file')}>
                        <Paperclip />
                    </Button>
                    <input
                        ref={fileInput}
                        type="file"
                        className="hidden"
                        accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                        onChange={(event) => {
                            setFile(event.target.files?.[0] ?? null);
                            event.target.value = '';
                        }}
                    />
                    <textarea
                        ref={textarea}
                        rows={1}
                        dir="auto"
                        value={body}
                        onChange={(event) => {
                            setBody(event.target.value);
                            onTyping();
                            event.target.style.height = 'auto';
                            event.target.style.height = `${Math.min(event.target.scrollHeight, 140)}px`;
                        }}
                        onKeyDown={onKeyDown}
                        placeholder={t('Write a message...')}
                        className="max-h-36 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-surface-muted px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/70 focus:border-primary-500 focus:bg-surface focus:ring-4 focus:ring-primary-500/15"
                    />
                    {body.trim() || file ? (
                        <Button type="submit" size="icon" loading={sending} aria-label={t('Send')}>
                            {!sending && <Send className="rtl:-scale-x-100" />}
                        </Button>
                    ) : (
                        <Button variant="gold" size="icon" onClick={startRecording} disabled={sending} aria-label={t('Record a voice message')}>
                            {sending ? <Spinner className="text-white" /> : <Mic />}
                        </Button>
                    )}
                </div>
            )}
        </form>
    );
}
