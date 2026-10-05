import { router, usePage } from '@inertiajs/react';
import { BookOpenCheck, Building2, ChevronDown, Languages, LogOut, Menu, MonitorSmartphone, Moon, Sun, UserRound } from 'lucide-react';
import { useState } from 'react';
import { LogoMark } from '@/components/brand';
import { AppButton, AppDialog } from '@/components/install-app';
import { NotificationsMenu } from '@/components/layout/notifications-menu';
import { Avatar } from '@/components/ui/avatar';
import { Dropdown, DropdownItem, DropdownLabel, DropdownSeparator } from '@/components/ui/dropdown';
import { useTheme } from '@/hooks/use-theme';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { signOut } from '@/lib/push';
import { cn } from '@/lib/utils';

export function LanguageSwitch({ className }: { className?: string }) {
    const { locale } = usePage().props;

    return (
        <button
            type="button"
            onClick={() => router.post(route('locale'), { locale: locale === 'ar' ? 'en' : 'ar' }, { preserveScroll: true })}
            className={cn(
                'inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-muted transition hover:bg-surface hover:text-ink',
                className,
            )}
        >
            <Languages className="size-4.5" />
            <span>{locale === 'ar' ? 'EN' : 'ع'}</span>
        </button>
    );
}

export function ThemeToggle({ className }: { className?: string }) {
    const { isDark, toggle } = useTheme();
    const { t } = useTrans();

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={isDark ? t('Light mode') : t('Dark mode')}
            title={isDark ? t('Light mode') : t('Dark mode')}
            className={cn('inline-flex size-10 items-center justify-center rounded-xl text-muted transition hover:bg-surface hover:text-ink', className)}
        >
            {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
    );
}

function HijriDate() {
    const dates = useDates();
    const today = new Date();

    return (
        <div className="hidden items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs md:flex">
            <Moon className="size-3.5 text-gold-500" />
            <span className="font-semibold text-ink">{dates.hijri(today)}</span>
            <span className="text-line-strong">|</span>
            <span className="text-muted">{dates.date(today, { weekday: 'long', month: 'long' })}</span>
        </div>
    );
}

function UserMenu({ onApp }: { onApp: () => void }) {
    const { auth } = usePage().props;
    const { t } = useTrans();
    const labels = useLabels();
    const user = auth.user;

    if (!user) {
        return null;
    }

    return (
        <Dropdown
            trigger={
                <button
                    type="button"
                    className="flex items-center gap-2 rounded-xl p-1 pe-2 transition hover:bg-surface data-open:bg-surface"
                >
                    <Avatar name={user.name} src={user.avatar_url} size="sm" />
                    <span className="hidden max-w-32 truncate text-sm font-semibold text-ink sm:block">{user.name}</span>
                    <ChevronDown className="hidden size-4 text-muted sm:block" />
                </button>
            }
        >
            <DropdownLabel>
                <span className="block truncate text-sm font-bold text-ink">{user.name}</span>
                <span className="block truncate">{labels.role[user.role]}</span>
            </DropdownLabel>
            <DropdownSeparator />
            <DropdownItem icon={UserRound} href={route('profile.edit')}>
                {t('My profile')}
            </DropdownItem>
            {user.role === 'student' && user.academy && (
                <DropdownItem icon={BookOpenCheck} href={route('progress.student', user.id)}>
                    {t('My progress')}
                </DropdownItem>
            )}
            <DropdownItem icon={MonitorSmartphone} onClick={onApp}>
                {t('App and notifications')}
            </DropdownItem>
            <DropdownSeparator />
            <DropdownItem icon={LogOut} onClick={signOut} danger>
                {t('Sign out')}
            </DropdownItem>
        </Dropdown>
    );
}

/**
 * The administration is inside an academy with the account of its manager.
 */
function ImpersonationBanner() {
    const { impersonating } = usePage().props;
    const { t } = useTrans();
    const [leaving, setLeaving] = useState(false);

    if (!impersonating) {
        return null;
    }

    return (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 bg-gold-500 px-4 py-2 text-sm text-primary-950 sm:px-6 lg:px-8">
            <Building2 className="size-4 shrink-0" />
            <p className="min-w-0 flex-1 font-semibold">
                {t('You are inside :academy with the account of its manager.', { academy: impersonating.academy ?? t('the academy') })}
            </p>
            <button
                type="button"
                disabled={leaving}
                onClick={() => router.post(route('impersonation.stop'), {}, { onStart: () => setLeaving(true), onFinish: () => setLeaving(false) })}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary-950/90 px-3 py-1 text-xs font-bold text-white transition hover:bg-primary-950 disabled:opacity-60"
            >
                <LogOut className="size-3.5 rtl:rotate-180" />
                {t('Back to the administration')}
            </button>
        </div>
    );
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
    const { t } = useTrans();
    const [appOpen, setAppOpen] = useState(false);

    return (
        <header className="no-print sticky top-0 z-20 border-b border-line/80 bg-canvas/85 backdrop-blur-md">
            <ImpersonationBanner />
            <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:px-8">
                <button
                    type="button"
                    onClick={onMenu}
                    aria-label={t('Open menu')}
                    className="inline-flex size-10 items-center justify-center rounded-xl text-ink transition hover:bg-surface lg:hidden"
                >
                    <Menu className="size-5" />
                </button>
                <LogoMark className="size-9 lg:hidden" />
                <HijriDate />
                <div className="ms-auto flex items-center gap-0.5">
                    <AppButton onOpen={() => setAppOpen(true)} />
                    <LanguageSwitch />
                    <ThemeToggle />
                    <NotificationsMenu />
                    <div className="ms-1">
                        <UserMenu onApp={() => setAppOpen(true)} />
                    </div>
                </div>
            </div>
            <AppDialog open={appOpen} onClose={() => setAppOpen(false)} />
        </header>
    );
}
