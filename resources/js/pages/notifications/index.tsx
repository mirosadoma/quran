import { Link, router } from '@inertiajs/react';
import { Bell, CheckCheck } from 'lucide-react';
import { NotificationIcon } from '@/components/layout/notifications-menu';
import { LinkButton } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import AppLayout from '@/layouts/app-layout';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { NotificationItem, Paginated } from '@/types';

export default function NotificationsIndex({ notifications }: { notifications: Paginated<NotificationItem> }) {
    const { t } = useTrans();
    const dates = useDates();
    const hasUnread = notifications.data.some((item) => !item.read_at);

    return (
        <AppLayout
            title={t('Notifications')}
            actions={
                hasUnread && (
                    <LinkButton href={route('notifications.read-all')} method="post" as="button" variant="secondary" preserveScroll>
                        <CheckCheck />
                        {t('Mark all as read')}
                    </LinkButton>
                )
            }
        >
            <Card className="overflow-hidden">
                {notifications.data.length === 0 ? (
                    <EmptyState icon={Bell} title={t('No notifications yet')} description={t('Session reminders, recitation feedback and announcements appear here.')} />
                ) : (
                    <ul className="divide-y divide-line">
                        {notifications.data.map((item) => (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    onClick={() => router.post(route('notifications.read', item.id))}
                                    className={cn(
                                        'flex w-full items-start gap-4 px-5 py-4 text-start transition hover:bg-surface-muted/60 sm:px-6',
                                        !item.read_at && 'bg-primary-50/40 dark:bg-primary-500/5',
                                    )}
                                >
                                    <NotificationIcon item={item} />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-2">
                                            <span className="font-semibold text-ink">{item.title}</span>
                                            {!item.read_at && <span className="size-2 rounded-full bg-gold-500" />}
                                        </span>
                                        <span className="mt-1 block text-sm leading-relaxed text-muted">{item.body}</span>
                                    </span>
                                    {item.created_at && (
                                        <span className="shrink-0 text-xs text-muted" title={dates.dateTime(item.created_at)}>
                                            {dates.relative(item.created_at)}
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </Card>
            <Pagination data={notifications} className="mt-6" />
            <p className="mt-6 text-center text-xs text-muted">
                <Link href={route('profile.edit')} className="hover:underline">
                    {t('Manage email and WhatsApp notifications from your profile.')}
                </Link>
            </p>
        </AppLayout>
    );
}
