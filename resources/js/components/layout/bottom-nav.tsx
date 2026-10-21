import { Link, usePage } from '@inertiajs/react';
import {
    BookOpen,
    BookOpenText,
    Building2,
    CalendarDays,
    ChartColumn,
    CirclePlay,
    HandHeart,
    House,
    LayoutDashboard,
    LayoutGrid,
    LogIn,
    MessagesSquare,
    UserPlus,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export interface BottomNavItem {
    label: string;
    href: string;
    active: boolean;
    icon: LucideIcon;
    badge?: number;
}

/**
 * The tabs of the bottom bar: the pages of the public website for visitors, and the most used pages of the
 * control panel of their role for the signed-in users (the rest of the pages are under "More").
 */
export function useBottomNavItems(): BottomNavItem[] {
    const { auth, counts } = usePage().props;
    const { t } = useTrans();
    const user = auth.user;
    const current = (...patterns: string[]) => patterns.some((pattern) => route().current(pattern) ?? false);

    if (!user) {
        return [
            { label: t('Home'), href: route('home'), active: current('home'), icon: House },
            { label: t('Academies'), href: route('site.academies'), active: current('site.academies', 'site.academy'), icon: Building2 },
            { label: t('Videos'), href: route('site.videos'), active: current('site.videos'), icon: CirclePlay },
            { label: t('New account'), href: route('register'), active: current('register'), icon: UserPlus },
            { label: t('Sign in'), href: route('login'), active: current('login', 'password.*'), icon: LogIn },
        ];
    }

    const dashboard: BottomNavItem = { label: t('Dashboard'), href: route('dashboard'), active: current('dashboard'), icon: LayoutDashboard };
    const halaqat: BottomNavItem = { label: t('My halaqat'), href: route('halaqat.index'), active: current('halaqat.*'), icon: BookOpen };
    const sessions: BottomNavItem = { label: t('Sessions'), href: route('sessions.index'), active: current('sessions.*'), icon: CalendarDays };
    const chat: BottomNavItem = { label: t('Chat'), href: route('chat.index'), active: current('chat.*'), icon: MessagesSquare, badge: counts?.chat };
    const mushaf: BottomNavItem = { label: t('Mushaf'), href: route('mushaf.index'), active: current('mushaf.*'), icon: BookOpenText };

    switch (user.role) {
        case 'admin':
            return [
                dashboard,
                { label: t('Academies'), href: route('academies.index'), active: current('academies.*'), icon: Building2 },
                { label: t('Users'), href: route('users.index'), active: current('users.*'), icon: Users },
                { label: t('Reports'), href: route('reports.index'), active: current('reports.*'), icon: ChartColumn },
            ];
        case 'manager':
            return [
                dashboard,
                { ...halaqat, label: t('Halaqat') },
                sessions,
                {
                    label: t('Requests'),
                    href: route('join-requests.index'),
                    active: current('join-requests.*'),
                    icon: UserPlus,
                    badge: counts?.join_requests,
                },
            ];
        case 'teacher':
            return [dashboard, halaqat, sessions, chat];
        default:
            // A student who studies on their own, without academy: no halaqat nor chat.
            return user.academy
                ? [dashboard, halaqat, mushaf, chat]
                : [
                      dashboard,
                      mushaf,
                      { label: t('Adhkar'), href: route('adhkar.index'), active: current('adhkar.*'), icon: HandHeart },
                      { label: t('Videos'), href: route('videos.index'), active: current('videos.*'), icon: CirclePlay },
                  ];
    }
}

const tabClass = 'flex h-full w-full flex-col items-center justify-center gap-1 px-0.5 text-[11px] font-semibold transition';

function TabIcon({ icon: Icon, active, badge }: { icon: LucideIcon; active: boolean; badge?: number }) {
    return (
        <span
            className={cn(
                'relative flex h-7 w-13 items-center justify-center rounded-full transition',
                active ? 'bg-primary-100 text-primary-800 dark:bg-primary-500/15 dark:text-primary-200' : 'text-muted',
            )}
        >
            <Icon className="size-5" strokeWidth={active ? 2.25 : 2} />
            {!!badge && (
                <span className="absolute -top-1 end-1.5 min-w-4.5 rounded-full bg-gold-500 px-1 text-center text-[10px] leading-4.5 font-bold text-primary-950 ring-2 ring-canvas">
                    {badge > 99 ? '99+' : badge}
                </span>
            )}
        </span>
    );
}

/**
 * The bottom bar of the phones, like the tabs of a mobile app. `onMore` adds the last tab, which opens the
 * full menu of the page (the sidebar of the control panel, the menu of the website).
 * The fixed parts of the pages keep above it through --bottom-nav-space (app.css).
 */
export function BottomNav({ onMore }: { onMore?: () => void }) {
    const { auth } = usePage().props;
    const { t } = useTrans();
    const items = useBottomNavItems();

    return (
        <nav
            data-bottom-nav
            aria-label={t('Quick navigation')}
            className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-canvas/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-18px_rgb(0_0_0/0.3)] backdrop-blur-md md:hidden"
        >
            <ul className="mx-auto flex h-16 max-w-lg items-stretch">
                {items.map((item) => (
                    <li key={item.href} className="min-w-0 flex-1">
                        <Link
                            href={item.href}
                            prefetch
                            aria-current={item.active ? 'page' : undefined}
                            className={cn(tabClass, item.active ? 'text-primary-800 dark:text-primary-200' : 'text-muted hover:text-ink')}
                        >
                            <TabIcon icon={item.icon} active={item.active} badge={item.badge} />
                            <span className="max-w-full truncate">{item.label}</span>
                        </Link>
                    </li>
                ))}
                {auth.user && onMore && (
                    <li className="min-w-0 flex-1">
                        <button type="button" onClick={onMore} className={cn(tabClass, 'text-muted hover:text-ink')}>
                            <TabIcon icon={LayoutGrid} active={false} />
                            <span className="max-w-full truncate">{t('More')}</span>
                        </button>
                    </li>
                )}
            </ul>
        </nav>
    );
}
