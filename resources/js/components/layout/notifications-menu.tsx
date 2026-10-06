import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Link, router, usePage } from '@inertiajs/react';
import {
    AlarmClock,
    Bell,
    BookOpenCheck,
    CalendarClock,
    CalendarPlus,
    CalendarX,
    CheckCheck,
    CircleCheck,
    CirclePlay,
    Mail,
    Megaphone,
    MessageCircleQuestionMark,
    MoonStar,
    Sun,
    UserCheck,
    UserPlus,
    Users,
    UserX,
    Video,
    type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Spinner } from '@/components/ui/button';
import { useDates } from '@/lib/dates';
import { http } from '@/lib/http';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { NotificationItem } from '@/types';

export const notificationIcons: Record<string, LucideIcon> = {
    users: Users,
    'calendar-plus': CalendarPlus,
    'calendar-clock': CalendarClock,
    'calendar-x': CalendarX,
    'alarm-clock': AlarmClock,
    video: Video,
    'book-open-check': BookOpenCheck,
    'circle-play': CirclePlay,
    'circle-check': CircleCheck,
    megaphone: Megaphone,
    'moon-star': MoonStar,
    sun: Sun,
    'user-plus': UserPlus,
    'user-check': UserCheck,
    'user-x': UserX,
    mail: Mail,
    'message-circle-question': MessageCircleQuestionMark,
    bell: Bell,
};

export const notificationTones: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
    gold: 'bg-gold-50 text-gold-600 dark:bg-gold-500/10 dark:text-gold-300',
    sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
    slate: 'bg-stone-100 text-stone-600 dark:bg-white/5 dark:text-stone-300',
};

export function NotificationIcon({ item, className }: { item: Pick<NotificationItem, 'icon' | 'color'>; className?: string }) {
    const Icon = notificationIcons[item.icon] ?? Bell;

    return (
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl', notificationTones[item.color] ?? notificationTones.emerald, className)}>
            <Icon className="size-4.5" />
        </span>
    );
}

export function NotificationsMenu() {
    const { counts } = usePage().props;
    const { t } = useTrans();
    const dates = useDates();
    const [items, setItems] = useState<NotificationItem[] | null>(null);
    const unread = counts?.notifications ?? 0;

    const load = () => {
        http.get<{ notifications: NotificationItem[] }>(route('notifications.latest')).then(({ data }) => setItems(data.notifications));
    };

    const open = (item: NotificationItem) => {
        router.post(route('notifications.read', item.id));
    };

    return (
        <Popover className="relative">
            <PopoverButton
                onClick={load}
                className="relative inline-flex size-10 items-center justify-center rounded-xl text-muted transition hover:bg-surface hover:text-ink focus:outline-none data-open:bg-surface data-open:text-ink"
                aria-label={t('Notifications')}
            >
                <Bell className="size-5" />
                {unread > 0 && (
                    <span className="absolute -end-0.5 -top-0.5 flex min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-4.5 text-white ring-2 ring-canvas">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </PopoverButton>
            <PopoverPanel
                transition
                anchor="bottom end"
                className="z-50 w-[min(92vw,380px)] rounded-2xl border border-line bg-surface shadow-2xl shadow-primary-950/15 transition duration-150 [--anchor-gap:10px] data-closed:scale-95 data-closed:opacity-0"
            >
                {({ close }) => (
                    <>
                        <div className="flex items-center justify-between border-b border-line px-4 py-3">
                            <p className="font-bold text-ink">{t('Notifications')}</p>
                            {unread > 0 && (
                                <Link
                                    href={route('notifications.read-all')}
                                    method="post"
                                    as="button"
                                    preserveScroll
                                    onSuccess={() => setItems((current) => current?.map((item) => ({ ...item, read_at: item.read_at ?? 'now' })) ?? null)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:underline dark:text-primary-300"
                                >
                                    <CheckCheck className="size-3.5" />
                                    {t('Mark all as read')}
                                </Link>
                            )}
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto">
                            {items === null && (
                                <div className="flex justify-center py-10">
                                    <Spinner />
                                </div>
                            )}
                            {items?.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted">{t('No notifications yet')}</p>}
                            {items?.map((item) => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => {
                                        close();
                                        open(item);
                                    }}
                                    className={cn(
                                        'flex w-full items-start gap-3 border-b border-line/60 px-4 py-3 text-start transition last:border-0 hover:bg-surface-muted',
                                        !item.read_at && 'bg-primary-50/50 dark:bg-primary-500/5',
                                    )}
                                >
                                    <NotificationIcon item={item} />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-2">
                                            <span className="truncate text-sm font-semibold text-ink">{item.title}</span>
                                            {!item.read_at && <span className="size-2 shrink-0 rounded-full bg-gold-500" />}
                                        </span>
                                        <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">{item.body}</span>
                                        {item.created_at && <span className="mt-1 block text-[11px] text-muted/80">{dates.relative(item.created_at)}</span>}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <Link
                            href={route('notifications.index')}
                            onClick={() => close()}
                            className="block rounded-b-2xl border-t border-line px-4 py-3 text-center text-sm font-semibold text-primary-700 hover:bg-surface-muted dark:text-primary-300"
                        >
                            {t('View all notifications')}
                        </Link>
                    </>
                )}
            </PopoverPanel>
        </Popover>
    );
}
