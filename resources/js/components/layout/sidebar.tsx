import { Link, usePage } from '@inertiajs/react';
import {
    Bell,
    BookOpen,
    BookOpenCheck,
    BookOpenText,
    Building2,
    CalendarDays,
    ChartColumn,
    CirclePlay,
    HandHeart,
    Inbox,
    LayoutDashboard,
    LogOut,
    MessagesSquare,
    MoonStar,
    Scale,
    School,
    Settings,
    Smile,
    UserPlus,
    UserRound,
    Users,
    type LucideIcon,
} from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { IslamicPattern, Logo } from '@/components/brand';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { signOut } from '@/lib/push';
import { cn } from '@/lib/utils';

interface NavItem {
    label: string;
    href: string;
    active: boolean;
    icon: LucideIcon;
    badge?: number;
}

interface NavGroup {
    label: string;
    items: NavItem[];
}

function useNavigation(): NavGroup[] {
    const { auth, counts } = usePage().props;
    const { t } = useTrans();
    const user = auth.user;

    if (!user) {
        return [];
    }

    const current = (pattern: string) => route().current(pattern) ?? false;
    const isAdmin = user.role === 'admin';
    const isManager = user.role === 'manager';
    const isStudent = user.role === 'student';
    // A student who studies on their own, without academy: no halaqat, sessions or chat.
    const isIndependent = isStudent && user.academy === null;

    const main: NavItem[] = [{ label: t('Dashboard'), href: route('dashboard'), active: current('dashboard'), icon: LayoutDashboard }];

    if (isStudent) {
        main.push({
            label: isIndependent ? t('Join an academy') : t('My academy'),
            href: route('my-academy'),
            active: current('my-academy'),
            icon: School,
        });
    }

    const learning: NavItem[] = isIndependent
        ? [{ label: t('Video library'), href: route('videos.index'), active: current('videos.*'), icon: CirclePlay }]
        : [
              {
                  label: isAdmin || isManager ? t('Halaqat') : t('My halaqat'),
                  href: route('halaqat.index'),
                  active: current('halaqat.*'),
                  icon: BookOpen,
              },
              { label: t('Sessions'), href: route('sessions.index'), active: current('sessions.*'), icon: CalendarDays },
              {
                  label: isStudent ? t('My progress') : t('Recitations'),
                  href: isStudent ? route('progress.student', user.id) : route('progress.index'),
                  active: current('progress.*'),
                  icon: BookOpenCheck,
              },
              { label: t('Video library'), href: route('videos.index'), active: current('videos.*'), icon: CirclePlay },
          ];

    const communication: NavItem[] = [
        {
            label: t('Notifications'),
            href: route('notifications.index'),
            active: current('notifications.*'),
            icon: Bell,
            badge: counts?.notifications,
        },
    ];

    if (!isIndependent) {
        communication.unshift({ label: t('Chat'), href: route('chat.index'), active: current('chat.*'), icon: MessagesSquare, badge: counts?.chat });
    }

    const groups: NavGroup[] = [
        { label: t('Main'), items: main },
        { label: t('Learning'), items: learning },
        {
            label: t('Quran and worship'),
            items: [
                { label: t('The recited mushaf'), href: route('mushaf.index'), active: current('mushaf.*'), icon: BookOpenText },
                { label: t('Kids memorization'), href: route('kids.index'), active: current('kids.*'), icon: Smile },
                { label: t('Adhkar and duas'), href: route('adhkar.index'), active: current('adhkar.*'), icon: HandHeart },
                { label: t('Prayer'), href: route('prayers.index'), active: current('prayers.*'), icon: MoonStar },
                { label: t('Self-accounting'), href: route('deeds.index'), active: current('deeds.*'), icon: Scale },
            ],
        },
        { label: t('Communication'), items: communication },
    ];

    const management: NavItem[] = [];

    if (isAdmin) {
        management.push({ label: t('Academies'), href: route('academies.index'), active: current('academies.*'), icon: Building2 });
    }

    if (isAdmin || isManager) {
        management.push(
            {
                label: t('Join requests'),
                href: route('join-requests.index'),
                active: current('join-requests.*'),
                icon: UserPlus,
                badge: counts?.join_requests,
            },
            { label: isAdmin ? t('Users') : t('Teachers and students'), href: route('users.index'), active: current('users.*'), icon: Users },
        );
    }

    if (isAdmin) {
        management.push({
            label: t('Contact messages'),
            href: route('contact-messages.index'),
            active: current('contact-messages.*'),
            icon: Inbox,
            badge: counts?.contact_messages,
        });
    }

    if (!isStudent) {
        management.push({ label: t('Reports'), href: route('reports.index'), active: current('reports.*'), icon: ChartColumn });
    }

    if (isManager && user.academy) {
        management.push({
            label: t('Academy profile'),
            href: route('academies.edit', user.academy.id),
            active: current('academies.*'),
            icon: School,
        });
    }

    if (isAdmin) {
        management.push({ label: t('Settings'), href: route('settings.edit'), active: current('settings.*'), icon: Settings });
    }

    if (management.length > 0) {
        groups.push({ label: t('Management'), items: management });
    }

    return groups;
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
    const { auth } = usePage().props;
    const { t } = useTrans();
    const labels = useLabels();
    const groups = useNavigation();
    const user = auth.user;

    return (
        <div className="relative flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-ink">
            <IslamicPattern className="text-gold-300/[0.06]" size={72} />
            <div className="pointer-events-none absolute -top-24 start-1/2 size-64 -translate-x-1/2 rounded-full bg-primary-500/15 blur-3xl rtl:translate-x-1/2" />

            <div className="relative px-5 pb-4 pt-6">
                <Link href={route('dashboard')} onClick={onNavigate}>
                    <Logo light />
                </Link>
            </div>

            <nav className="relative flex-1 space-y-4 overflow-y-auto px-3 py-1">
                {groups.map((group) => (
                    <div key={group.label}>
                        <p className="mb-1 px-3 text-xs font-semibold tracking-wide text-sidebar-ink/45">{group.label}</p>
                        <ul className="space-y-0.5">
                            {group.items.map((item) => (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        onClick={onNavigate}
                                        prefetch
                                        className={cn(
                                            'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-base font-medium text-[15px] transition',
                                            item.active
                                                ? 'bg-white/10 text-white shadow-inner shadow-white/5'
                                                : 'text-sidebar-ink/75 hover:bg-white/5 hover:text-white',
                                        )}
                                    >
                                        {item.active && <span className="absolute inset-y-2 start-0 w-1 rounded-full bg-gold-400" />}
                                        <item.icon
                                            className={cn('size-5 shrink-0', item.active ? 'text-gold-300' : 'text-sidebar-ink/55 group-hover:text-gold-200')}
                                        />
                                        <span className="flex-1 truncate">{item.label}</span>
                                        {!!item.badge && (
                                            <span className="min-w-5 rounded-full bg-gold-500 px-1.5 py-px text-center text-[11px] font-bold text-primary-950">
                                                {item.badge > 99 ? '99+' : item.badge}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </nav>

            {user && (
                <div className="relative border-t border-white/10 p-3">
                    <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-2.5">
                        <Link href={route('profile.edit')} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3">
                            <Avatar name={user.name} src={user.avatar_url} size="sm" className="ring-white/20" />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                                <p className="truncate text-xs text-sidebar-ink/55">
                                    {labels.role[user.role]}
                                    {user.academy && ` · ${user.academy.name}`}
                                </p>
                            </div>
                        </Link>
                        <button
                            type="button"
                            onClick={signOut}
                            title={t('Sign out')}
                            aria-label={t('Sign out')}
                            className="rounded-lg p-2 text-sidebar-ink/60 transition hover:bg-white/10 hover:text-white"
                        >
                            <LogOut className="size-4 rtl:rotate-180" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export function ProfileShortcut() {
    const { t } = useTrans();

    return (
        <Link href={route('profile.edit')} className="flex items-center gap-2 text-sm text-muted hover:text-ink">
            <UserRound className="size-4" />
            {t('Profile')}
        </Link>
    );
}
