import { router } from '@inertiajs/react';
import { Inbox, Mail, MailOpen, MessageCircle, Phone, Trash } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/modal';
import { Pagination } from '@/components/ui/pagination';
import { Tabs } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ContactMessageItem, Paginated } from '@/types';

interface ContactMessagesIndexProps {
    messages: Paginated<ContactMessageItem>;
    filters: { filter: 'all' | 'unread' };
    unread: number;
}

function whatsappLink(phone: string): string {
    return `https://wa.me/${phone.replace(/[^0-9]/g, '')}`;
}

export default function ContactMessagesIndex({ messages, filters, unread }: ContactMessagesIndexProps) {
    const { t } = useTrans();
    const dates = useDates();
    const [expanded, setExpanded] = useState<number | null>(null);
    const [deleting, setDeleting] = useState<ContactMessageItem | null>(null);

    const toggleRead = (message: ContactMessageItem) => {
        router.patch(route('contact-messages.read', message.id), {}, { preserveScroll: true, preserveState: true });
    };

    const open = (message: ContactMessageItem) => {
        const opening = expanded !== message.id;

        setExpanded(opening ? message.id : null);

        // Opening an unread message marks it read.
        if (opening && !message.read_at) {
            toggleRead(message);
        }
    };

    return (
        <AppLayout title={t('Contact messages')} description={t('Messages sent from the contact page of the website.')}>
            <Tabs
                className="mb-6"
                value={filters.filter}
                onChange={(filter) =>
                    router.get(route('contact-messages.index'), filter === 'unread' ? { filter } : {}, { preserveState: true, preserveScroll: true, replace: true })
                }
                items={[
                    { value: 'all', label: t('All') },
                    { value: 'unread', label: t('Unread'), count: unread },
                ]}
            />

            {messages.data.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={Inbox}
                        title={filters.filter === 'unread' ? t('No unread messages') : t('No messages yet')}
                        description={t('Visitors write to you from the contact page; their messages arrive here and as a notification.')}
                    />
                </Card>
            ) : (
                <div className="space-y-3">
                    {messages.data.map((message) => {
                        const isOpen = expanded === message.id;

                        return (
                            <Card key={message.id} className={cn('overflow-hidden', !message.read_at && 'border-primary-500/40 bg-primary-50/40 dark:bg-primary-500/5')}>
                                <button type="button" onClick={() => open(message)} className="block w-full p-4 text-start sm:p-5">
                                    <div className="flex items-start gap-3">
                                        <span
                                            className={cn(
                                                'mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl',
                                                message.read_at ? 'bg-surface-muted text-muted' : 'bg-primary-600 text-white',
                                            )}
                                        >
                                            {message.read_at ? <MailOpen className="size-4.5" /> : <Mail className="size-4.5" />}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                                                <p className={cn('text-ink', message.read_at ? 'font-semibold' : 'font-bold')}>{message.name}</p>
                                                {message.created_at && <span className="text-xs text-muted">{dates.relative(message.created_at)}</span>}
                                            </div>
                                            {message.subject && <p className="mt-0.5 text-sm font-semibold text-ink">{message.subject}</p>}
                                            <p className={cn('mt-1 text-sm leading-relaxed whitespace-pre-line text-muted', !isOpen && 'line-clamp-2')}>{message.message}</p>
                                        </div>
                                    </div>
                                </button>

                                {isOpen && (
                                    <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-muted/60 px-4 py-3 sm:px-5">
                                        {message.email && (
                                            <a
                                                href={`mailto:${message.email}?subject=${encodeURIComponent(`${t('Re:')} ${message.subject ?? t('Your message')}`)}`}
                                                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-line-strong"
                                                dir="ltr"
                                            >
                                                <Mail className="size-4" />
                                                {message.email}
                                            </a>
                                        )}
                                        {message.phone && (
                                            <>
                                                <a
                                                    href={whatsappLink(message.phone)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700"
                                                >
                                                    <MessageCircle className="size-4" />
                                                    {t('WhatsApp')}
                                                </a>
                                                <a
                                                    href={`tel:${message.phone}`}
                                                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink transition hover:border-line-strong"
                                                    dir="ltr"
                                                >
                                                    <Phone className="size-4" />
                                                    {message.phone}
                                                </a>
                                            </>
                                        )}
                                        <div className="ms-auto flex gap-1">
                                            <Button variant="ghost" size="sm" onClick={() => toggleRead(message)}>
                                                <Mail />
                                                {t('Mark as unread')}
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => setDeleting(message)} className="text-rose-600 hover:text-rose-700">
                                                <Trash />
                                                {t('Delete')}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}

            <Pagination data={messages} className="mt-6" />

            <ConfirmDialog
                open={deleting !== null}
                onClose={() => setDeleting(null)}
                onConfirm={() =>
                    deleting && router.delete(route('contact-messages.destroy', deleting.id), { preserveScroll: true, onFinish: () => setDeleting(null) })
                }
                title={t('Delete the message of :name?', { name: deleting?.name ?? '' })}
                confirmLabel={t('Delete')}
            />
        </AppLayout>
    );
}
