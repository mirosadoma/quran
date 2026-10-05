import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { Head, Link, usePage } from '@inertiajs/react';
import { Download, LayoutDashboard, LogIn, Mail, Menu, Phone, UserPlus, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { IslamicPattern, Logo, StarOrnament } from '@/components/brand';
import { LanguageSwitch, ThemeToggle } from '@/components/layout/topbar';
import { LinkButton } from '@/components/ui/button';
import { useDocumentDirection, useFlashToasts } from '@/hooks/use-app-shell';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface PublicLayoutProps {
    title: string;
    /** The description of the page for search engines and shared links. */
    description?: string;
    children: ReactNode;
}

interface NavLink {
    label: string;
    href: string;
    active: boolean;
}

function useNavLinks(): NavLink[] {
    const { t } = useTrans();
    const current = (pattern: string) => route().current(pattern) ?? false;

    return [
        { label: t('Home'), href: route('home'), active: current('home') },
        { label: t('Academies'), href: route('site.academies'), active: current('site.academies') || current('site.academy') },
        { label: t('Videos'), href: route('site.videos'), active: current('site.videos') },
        { label: t('System guide'), href: route('site.guide'), active: current('site.guide') },
        { label: t('About us'), href: route('site.about'), active: current('site.about') },
        { label: t('FAQ'), href: route('site.faq'), active: current('site.faq') },
        { label: t('Contact us'), href: route('site.contact'), active: current('site.contact') },
    ];
}

function AuthButtons({ stacked = false, onNavigate }: { stacked?: boolean; onNavigate?: () => void }) {
    const { auth } = usePage().props;
    const { t } = useTrans();

    if (auth.user) {
        return (
            <LinkButton href={route('dashboard')} onClick={onNavigate} className={cn(stacked && 'w-full')}>
                <LayoutDashboard />
                {t('Dashboard')}
            </LinkButton>
        );
    }

    return (
        <div className={cn('flex gap-2', stacked && 'flex-col')}>
            <LinkButton href={route('login')} variant={stacked ? 'secondary' : 'ghost'} onClick={onNavigate} className={cn(stacked && 'w-full')}>
                <LogIn className="rtl:rotate-180" />
                {t('Sign in')}
            </LinkButton>
            <LinkButton href={route('register')} onClick={onNavigate} className={cn(stacked && 'w-full')}>
                <UserPlus />
                {t('Create a free account')}
            </LinkButton>
        </div>
    );
}

function Header() {
    const { t } = useTrans();
    const links = useNavLinks();
    const [open, setOpen] = useState(false);

    return (
        <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/85 backdrop-blur-md">
            <div className="mx-auto flex h-18 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
                <Link href={route('home')} className="shrink-0" aria-label={t('Home')}>
                    <Logo />
                </Link>

                <nav className="mx-auto hidden items-center gap-1 xl:flex">
                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                'rounded-xl px-3 py-2 text-sm font-semibold transition',
                                link.active ? 'bg-primary-50 text-primary-800 dark:bg-primary-500/10 dark:text-primary-200' : 'text-muted hover:bg-surface hover:text-ink',
                            )}
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>

                <div className="ms-auto flex items-center gap-0.5 xl:ms-0">
                    <LanguageSwitch />
                    <ThemeToggle />
                    <div className="ms-2 hidden sm:block">
                        <AuthButtons />
                    </div>
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        aria-label={t('Open menu')}
                        className="inline-flex size-10 items-center justify-center rounded-xl text-ink transition hover:bg-surface xl:hidden"
                    >
                        <Menu className="size-5" />
                    </button>
                </div>
            </div>

            <Dialog open={open} onClose={setOpen} className="relative z-50 xl:hidden">
                <DialogBackdrop transition className="fixed inset-0 bg-primary-950/50 backdrop-blur-sm transition duration-300 data-closed:opacity-0" />
                <div className="fixed inset-0 flex justify-end">
                    <DialogPanel
                        transition
                        className="flex w-80 max-w-[88vw] flex-col overflow-y-auto bg-canvas shadow-2xl transition duration-300 ease-out data-closed:translate-x-full rtl:data-closed:-translate-x-full"
                    >
                        <div className="flex items-center justify-between border-b border-line px-5 py-4">
                            <Logo />
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label={t('Close')}
                                className="rounded-lg p-1.5 text-muted transition hover:bg-surface hover:text-ink"
                            >
                                <X className="size-5" />
                            </button>
                        </div>
                        <nav className="flex-1 space-y-1 p-4">
                            {links.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setOpen(false)}
                                    className={cn(
                                        'block rounded-xl px-4 py-3 text-base font-semibold transition',
                                        link.active ? 'bg-primary-50 text-primary-800 dark:bg-primary-500/10 dark:text-primary-200' : 'text-ink hover:bg-surface',
                                    )}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                        <div className="space-y-3 border-t border-line p-4">
                            <AuthButtons stacked onNavigate={() => setOpen(false)} />
                            <Link
                                href={route('install')}
                                onClick={() => setOpen(false)}
                                className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-primary-700 dark:text-primary-300"
                            >
                                <Download className="size-4" />
                                {t('Install the app')}
                            </Link>
                        </div>
                    </DialogPanel>
                </div>
            </Dialog>
        </header>
    );
}

function Footer() {
    const { app } = usePage().props;
    const contact = app.contact;
    const { t } = useTrans();

    const columns = [
        {
            title: t('The platform'),
            links: [
                { label: t('About us'), href: route('site.about') },
                { label: t('Academies'), href: route('site.academies') },
                { label: t('Videos'), href: route('site.videos') },
                { label: t('System guide'), href: route('site.guide') },
            ],
        },
        {
            title: t('Help'),
            links: [
                { label: t('FAQ'), href: route('site.faq') },
                { label: t('Contact us'), href: route('site.contact') },
                { label: t('Terms and policies'), href: route('site.terms') },
                { label: t('Install the app'), href: route('install') },
            ],
        },
        {
            title: t('Your account'),
            links: [
                { label: t('Sign in'), href: route('login') },
                { label: t('Create a free account'), href: route('register') },
                { label: t('Forgot your password?'), href: route('password.request') },
            ],
        },
    ];

    return (
        <footer className="relative overflow-hidden bg-sidebar text-sidebar-ink">
            <IslamicPattern className="text-gold-300/[0.07]" size={72} />
            <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-8 sm:px-6 lg:px-8">
                <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
                    <div className="max-w-sm">
                        <Logo light />
                        <p className="mt-4 text-sm leading-relaxed text-sidebar-ink/70">
                            {app.tagline ?? t('A platform to memorize the Holy Quran with academies, teachers and halaqat, and tools for worship every day.')}
                        </p>
                        <p className="font-quran mt-5 text-xl text-gold-300" dir="rtl">
                            ﴿ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا ﴾
                        </p>
                        {(contact.email || contact.phone) && (
                            <div className="mt-5 space-y-1.5 text-sm text-sidebar-ink/75">
                                {contact.email && (
                                    <a href={`mailto:${contact.email}`} className="flex items-center gap-2 hover:text-white" dir="ltr">
                                        <Mail className="size-4 text-gold-300" />
                                        {contact.email}
                                    </a>
                                )}
                                {contact.phone && (
                                    <a href={`tel:${contact.phone}`} className="flex items-center gap-2 hover:text-white" dir="ltr">
                                        <Phone className="size-4 text-gold-300" />
                                        {contact.phone}
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                    {columns.map((column) => (
                        <div key={column.title}>
                            <p className="text-sm font-bold text-white">{column.title}</p>
                            <ul className="mt-4 space-y-2.5">
                                {column.links.map((link) => (
                                    <li key={link.href}>
                                        <Link href={link.href} className="text-sm text-sidebar-ink/70 transition hover:text-gold-200">
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
                <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-sidebar-ink/55 sm:flex-row">
                    <p>
                        © {new Date().getFullYear()} {app.name}. {t('All rights reserved.')}
                    </p>
                    <p className="flex items-center gap-2">
                        <StarOrnament className="size-3 text-gold-400" />
                        {t('«The best of you are those who learn the Quran and teach it»')}
                    </p>
                </div>
            </div>
        </footer>
    );
}

/**
 * The public website: header with the pages and the account buttons, and the footer.
 */
export default function PublicLayout({ title, description, children }: PublicLayoutProps) {
    useFlashToasts();
    useDocumentDirection();

    return (
        <div className="flex min-h-dvh flex-col">
            <Head title={title}>{description && <meta name="description" content={description} />}</Head>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
        </div>
    );
}
