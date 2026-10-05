import { Head, Link, usePage } from '@inertiajs/react';
import { BellRing, CircleCheckBig, Download, LogIn, MonitorSmartphone, ShieldAlert, Wifi, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { IslamicPattern, LogoMark } from '@/components/brand';
import { IosInstallSteps } from '@/components/install-app';
import { LanguageSwitch, ThemeToggle } from '@/components/layout/topbar';
import { Button, buttonClasses } from '@/components/ui/button';
import { useDocumentDirection } from '@/hooks/use-app-shell';
import { useInstallPrompt } from '@/hooks/use-install-prompt';
import { useTrans } from '@/lib/i18n';
import { isStandalone } from '@/lib/pwa';

/**
 * Shared link to install the app: the install button, or the steps for the device.
 */
export default function Install() {
    const { app, auth } = usePage().props;
    const { t } = useTrans();
    const { mode, install } = useInstallPrompt();
    const [installed, setInstalled] = useState(false);
    const [standalone] = useState(isStandalone);
    const secure = window.isSecureContext;

    useDocumentDirection();

    useEffect(() => {
        const onInstalled = () => setInstalled(true);
        window.addEventListener('appinstalled', onInstalled);

        return () => window.removeEventListener('appinstalled', onInstalled);
    }, []);

    const onInstall = async () => {
        if (await install()) {
            setInstalled(true);
        }
    };

    const benefits = [
        { icon: Zap, text: t('Opens in one tap from your home screen') },
        { icon: BellRing, text: t('Notifications even when the app is closed') },
        { icon: Wifi, text: t('Light, with no store and no large download') },
    ];

    let action;

    if (installed || standalone) {
        action = (
            <p className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CircleCheckBig className="size-5" />
                {t('The app is installed. Open it from your home screen.')}
            </p>
        );
    } else if (mode === 'prompt') {
        action = (
            <Button size="lg" className="w-full text-lg" onClick={onInstall}>
                <Download />
                {t('Install the app')}
            </Button>
        );
    } else if (mode === 'ios') {
        action = (
            <div className="rounded-2xl bg-surface-muted p-4 text-start">
                <p className="mb-3 text-sm font-bold text-ink">{t('On iPhone and iPad, open this link in Safari, then:')}</p>
                <IosInstallSteps />
            </div>
        );
    } else if (!secure) {
        action = (
            <p className="flex items-start gap-2 rounded-2xl bg-gold-50 p-4 text-start text-sm leading-relaxed text-gold-800 dark:bg-gold-500/10 dark:text-gold-200">
                <ShieldAlert className="mt-0.5 size-5 shrink-0" />
                {t('Browsers install apps and deliver notifications only on secure addresses that start with https://.')}
            </p>
        );
    } else {
        action = (
            <div className="space-y-2 rounded-2xl bg-surface-muted p-4 text-start text-sm leading-relaxed text-ink">
                <p className="flex items-center gap-2 font-bold">
                    <MonitorSmartphone className="size-5 text-primary-600" />
                    {t('Install from the browser menu')}
                </p>
                <p>{t('On Android: open the menu ⋮ of Chrome and choose “Install app” or “Add to Home screen”.')}</p>
                <p>{t('On a computer: press the install icon at the end of the address bar, or open the menu and choose “Install”.')}</p>
            </div>
        );
    }

    return (
        <div className="relative flex min-h-dvh flex-col overflow-hidden bg-sidebar px-4 py-6">
            <Head title={t('Install the app')} />
            <IslamicPattern className="text-gold-300/[0.1]" size={80} />
            <div className="pointer-events-none absolute -top-40 start-1/2 size-[520px] -translate-x-1/2 rounded-full bg-primary-500/20 blur-3xl rtl:translate-x-1/2" />

            <div className="relative mx-auto flex w-full max-w-md justify-end gap-1 text-white [&_button]:text-white/80 [&_button:hover]:bg-white/10">
                <LanguageSwitch />
                <ThemeToggle />
            </div>

            <main className="relative mx-auto my-auto w-full max-w-md py-8">
                <div className="rounded-[2rem] bg-surface p-6 text-center shadow-2xl shadow-black/30 sm:p-8">
                    <div className="mx-auto -mt-16 mb-4 w-fit rounded-[1.75rem] bg-surface p-2 shadow-xl">
                        {app.logo_url ? (
                            <img src={app.logo_url} alt="" className="size-24 rounded-3xl object-cover" />
                        ) : (
                            <LogoMark className="size-24" />
                        )}
                    </div>
                    <h1 className="font-quran text-4xl font-bold text-ink">{app.name}</h1>
                    <p className="mt-1 text-sm text-muted">{app.tagline || t('Quran memorization platform')}</p>

                    <ul className="my-6 space-y-2.5 text-start">
                        {benefits.map((benefit) => (
                            <li key={benefit.text} className="flex items-center gap-3 text-sm text-ink">
                                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                                    <benefit.icon className="size-4.5" />
                                </span>
                                {benefit.text}
                            </li>
                        ))}
                    </ul>

                    {action}

                    <Link href={auth.user ? route('dashboard') : route('login')} className={buttonClasses({ variant: 'ghost', className: 'mt-4 w-full' })}>
                        <LogIn className="rtl:rotate-180" />
                        {auth.user ? t('Open the platform') : t('Sign in to the platform')}
                    </Link>
                </div>
            </main>
        </div>
    );
}
