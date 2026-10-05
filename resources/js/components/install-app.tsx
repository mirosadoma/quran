import { usePage } from '@inertiajs/react';
import {
    BellOff,
    BellRing,
    CircleCheckBig,
    Copy,
    Download,
    ExternalLink,
    MessageCircle,
    MonitorSmartphone,
    Send,
    Share,
    Share2,
    ShieldAlert,
    SquarePlus,
    X,
    type LucideIcon,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LogoMark } from '@/components/brand';
import { Button, buttonClasses } from '@/components/ui/button';
import { Switch } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { useInstallPrompt } from '@/hooks/use-install-prompt';
import { usePush } from '@/hooks/use-push';
import { useTrans } from '@/lib/i18n';
import { disablePush, sendTestPush } from '@/lib/push';
import { isIos, isStandalone } from '@/lib/pwa';
import { cn, copyText } from '@/lib/utils';

/**
 * The app button of the top bar: install the platform as an app and turn on its notifications.
 * Shown until the app is installed and, for signed-in users, its notifications are decided.
 * Without onOpen it opens its own dialog (pages without the top bar).
 */
export function AppButton({ onOpen, className }: { onOpen?: () => void; className?: string }) {
    const { auth } = usePage().props;
    const { t } = useTrans();
    const { status } = usePush();
    const [installed] = useState(isStandalone);
    const [open, setOpen] = useState(false);

    if (installed && !(auth.user && status === 'off')) {
        return null;
    }

    const label = installed ? t('Turn on notifications') : t('Install app');
    const Icon = installed ? BellRing : Download;

    return (
        <>
            <button
                type="button"
                onClick={() => (onOpen ? onOpen() : setOpen(true))}
                title={label}
                aria-label={label}
                className={cn(
                    'inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-primary-700 transition hover:bg-surface dark:text-primary-300',
                    className,
                )}
            >
                <Icon className="size-4.5" />
                <span className="hidden sm:inline">{label}</span>
            </button>
            {!onOpen && <AppDialog open={open} onClose={() => setOpen(false)} />}
        </>
    );
}

export function AppDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { t } = useTrans();
    const push = usePush();
    const { refresh } = push;
    const secure = window.isSecureContext;

    // The permission may have been changed in the browser settings meanwhile.
    useEffect(() => {
        if (open) {
            void refresh();
        }
    }, [open, refresh]);

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="sm"
            title={t('App and notifications')}
            description={t('Install the platform on your device and receive its notifications.')}
            footer={<Button onClick={onClose}>{t('Done')}</Button>}
        >
            <div className="space-y-4">
                <AppIdentity />
                {!secure && <InsecureNotice />}
                <InstallSection secure={secure} />
                <NotificationsSection push={push} />
                <ShareInstallLink />
            </div>
        </Modal>
    );
}

/**
 * Invites signed-in users to turn on notifications on this device (dashboards).
 */
export function PushPrompt() {
    const { t } = useTrans();
    const { status, enable } = usePush();
    const [dismissed, setDismissed] = useState(() => readFlag(PROMPT_DISMISSED));
    const [busy, setBusy] = useState(false);

    if (dismissed || status !== 'off' || Notification.permission !== 'default') {
        return null;
    }

    const dismiss = () => {
        writeFlag(PROMPT_DISMISSED);
        setDismissed(true);
    };

    const turnOn = async () => {
        setBusy(true);

        try {
            const result = await enable();

            if (result === 'on') {
                toast.success(t('Notifications are on for this device.'));
            } else if (result === 'denied') {
                toast.error(t('Notifications were blocked. Allow them from the site settings in the browser.'));
            }
        } catch {
            toast.error(t('Could not turn on the notifications. Try again.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="relative mb-6 flex flex-col gap-4 rounded-2xl border border-gold-200 bg-gold-50/70 p-4 pe-12 sm:flex-row sm:items-center dark:border-gold-500/20 dark:bg-gold-500/10">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gold-500 text-white shadow-sm">
                <BellRing className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="font-bold text-ink">{t('Turn on notifications on this device')}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted">
                    {t('Session reminders, recitation results and halaqa messages reach you even when the app is closed.')}
                </p>
            </div>
            <Button variant="gold" loading={busy} onClick={turnOn} className="self-start sm:self-center">
                <BellRing />
                {t('Turn on')}
            </Button>
            <button
                type="button"
                onClick={dismiss}
                aria-label={t('Not now')}
                title={t('Not now')}
                className="absolute end-2 top-2 rounded-lg p-1.5 text-muted transition hover:bg-gold-100 hover:text-ink dark:hover:bg-gold-500/15"
            >
                <X className="size-4" />
            </button>
        </div>
    );
}

const PROMPT_DISMISSED = 'push-prompt-dismissed';

function readFlag(key: string): boolean {
    try {
        return localStorage.getItem(key) === '1';
    } catch {
        return false;
    }
}

function writeFlag(key: string): void {
    try {
        localStorage.setItem(key, '1');
    } catch {
        // Private mode: the prompt simply shows again next time.
    }
}

function AppIdentity() {
    const { app } = usePage().props;
    const { t } = useTrans();

    return (
        <div className="flex items-center gap-4 rounded-2xl bg-surface-muted p-4">
            {app.logo_url ? (
                <img src={app.logo_url} alt="" className="size-16 shrink-0 rounded-[18px] object-cover shadow-md" />
            ) : (
                <LogoMark className="size-16 shrink-0 drop-shadow-md" />
            )}
            <div className="min-w-0">
                <p className="truncate font-quran text-2xl font-bold leading-snug text-ink">{app.name}</p>
                <p className="truncate text-xs text-muted">{app.tagline || t('Quran memorization platform')}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {[t('Home screen icon'), t('Full screen'), t('Notifications')].map((feature) => (
                        <span key={feature} className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-muted ring-1 ring-line">
                            {feature}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

function InsecureNotice() {
    const { auth } = usePage().props;
    const { t } = useTrans();
    const secureUrl = `https://${window.location.host}${window.location.pathname}`;

    return (
        <div className="flex gap-3 rounded-2xl bg-gold-50 p-4 text-sm text-gold-800 dark:bg-gold-500/10 dark:text-gold-200">
            <ShieldAlert className="mt-0.5 size-5 shrink-0" />
            <div className="min-w-0 space-y-1.5 leading-relaxed">
                <p className="font-bold">{t('This address is not secure (http)')}</p>
                <p>{t('Browsers install apps and deliver notifications only on secure addresses that start with https://.')}</p>
                {auth.user?.role === 'admin' && (
                    <p className="text-xs opacity-85">
                        {t('For the administrator: serve the platform over HTTPS with a valid certificate. On a development computer, trust the local certificate first.')}
                    </p>
                )}
                <a href={secureUrl} className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4" dir="ltr">
                    <ExternalLink className="size-3.5" />
                    {secureUrl}
                </a>
            </div>
        </div>
    );
}

/**
 * The install link to send to anyone (WhatsApp, the phone's share sheet or a copy).
 */
function ShareInstallLink() {
    const { app } = usePage().props;
    const { t } = useTrans();
    const url = route('install');
    const message = t('Install :app on your phone from this link: :url', { app: app.name, url });

    const copy = async () => {
        if (await copyText(url)) {
            toast.success(t('The link was copied.'));
        }
    };

    const share = async () => {
        if (!navigator.share) {
            await copy();

            return;
        }

        try {
            await navigator.share({ title: app.name, text: t('Install :app on your phone', { app: app.name }), url });
        } catch {
            // Closed without sharing.
        }
    };

    return (
        <Section icon={Share2} title={t('Share the app')}>
            <Hint>{t('Send this link to anyone: it opens a page to install the app in one tap.')}</Hint>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-surface-muted p-1.5 ps-3">
                <span dir="ltr" className="min-w-0 flex-1 truncate text-sm text-ink">
                    {url}
                </span>
                <Button size="sm" variant="secondary" onClick={copy}>
                    <Copy />
                    {t('Copy')}
                </Button>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
                <a
                    href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonClasses({ variant: 'secondary', size: 'sm' })}
                >
                    <MessageCircle />
                    {t('WhatsApp')}
                </a>
                <Button size="sm" variant="secondary" onClick={share}>
                    <Share2 />
                    {t('Share')}
                </Button>
            </div>
        </Section>
    );
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
    return (
        <section className="rounded-2xl border border-line p-4">
            <h3 className="mb-3 flex items-center gap-2.5 text-sm font-bold text-ink">
                <span className="flex size-8 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                    <Icon className="size-4" />
                </span>
                {title}
            </h3>
            {children}
        </section>
    );
}

function StatusLine({ icon: Icon, tone, children }: { icon: LucideIcon; tone: 'success' | 'warning'; children: ReactNode }) {
    return (
        <p
            className={cn(
                'flex items-start gap-2 text-sm leading-relaxed',
                tone === 'success' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300',
            )}
        >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <span>{children}</span>
        </p>
    );
}

function Hint({ children }: { children: ReactNode }) {
    return <p className="text-sm leading-relaxed text-muted">{children}</p>;
}

function InstallSection({ secure }: { secure: boolean }) {
    const { t } = useTrans();
    const { mode, install } = useInstallPrompt();
    const [installed] = useState(isStandalone);
    const [installing, setInstalling] = useState(false);

    const onInstall = async () => {
        setInstalling(true);

        try {
            if (await install()) {
                toast.success(t('The app was installed.'));
            }
        } finally {
            setInstalling(false);
        }
    };

    let content: ReactNode;

    if (installed) {
        content = (
            <StatusLine icon={CircleCheckBig} tone="success">
                {t('The app is installed on this device.')}
            </StatusLine>
        );
    } else if (mode === 'prompt') {
        content = (
            <>
                <Hint>{t('Its own icon, full screen and faster to open.')}</Hint>
                <Button className="mt-3 w-full" loading={installing} onClick={onInstall}>
                    <Download />
                    {t('Install app')}
                </Button>
            </>
        );
    } else if (mode === 'ios') {
        content = <IosInstallSteps />;
    } else if (!secure) {
        content = <Hint>{t('Available once the platform is opened from its secure address.')}</Hint>;
    } else {
        content = (
            <Hint>
                {t('Open the browser menu (⋮ or ⋯) and choose “Install app” or “Add to Home screen”. If it is already installed, open it from your apps.')}
            </Hint>
        );
    }

    return (
        <Section icon={MonitorSmartphone} title={t('Install on this device')}>
            {content}
        </Section>
    );
}

export function IosInstallSteps() {
    const { t } = useTrans();

    const steps = [
        { icon: Share, text: t('Tap the Share button in the browser toolbar.') },
        { icon: SquarePlus, text: t('Choose “Add to Home Screen”.') },
        { icon: CircleCheckBig, text: t('Tap “Add”. The app appears on your home screen.') },
    ];

    return (
        <ol className="space-y-3">
            {steps.map((step, index) => (
                <li key={index} className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-primary-700 dark:text-primary-300">
                        <step.icon className="size-4.5" />
                    </span>
                    <span className="text-sm leading-relaxed text-ink">{step.text}</span>
                </li>
            ))}
        </ol>
    );
}

function NotificationsSection({ push }: { push: ReturnType<typeof usePush> }) {
    const { auth } = usePage().props;
    const { t } = useTrans();
    const [busy, setBusy] = useState(false);
    const [testing, setTesting] = useState(false);

    if (!auth.user) {
        return null;
    }

    const toggle = async (on: boolean) => {
        setBusy(true);

        try {
            if (on) {
                const result = await push.enable();

                if (result === 'on') {
                    toast.success(t('Notifications are on for this device.'));
                } else if (result === 'denied') {
                    toast.error(t('Notifications were blocked. Allow them from the site settings in the browser.'));
                }
            } else {
                await disablePush();
                toast.success(t('Notifications are off for this device.'));
            }
        } catch {
            toast.error(t('Could not turn on the notifications. Try again.'));
            await push.refresh();
        } finally {
            setBusy(false);
        }
    };

    const test = async () => {
        setTesting(true);

        try {
            await sendTestPush();
            toast.success(t('Test notification sent. It arrives in a few seconds.'));
        } catch {
            toast.error(t('Could not send the test notification.'));
        } finally {
            setTesting(false);
        }
    };

    let content: ReactNode;

    switch (push.status) {
        case 'checking':
            content = <div className="h-10 animate-pulse rounded-xl bg-surface-muted" />;
            break;
        case 'unconfigured':
            content = (
                <Hint>
                    {auth.user.role === 'admin'
                        ? t('Push notifications are off. Create the keys with php artisan webpush:keys, then turn them on in the settings.')
                        : t('The administration has not turned on push notifications yet.')}
                </Hint>
            );
            break;
        case 'insecure':
            content = <Hint>{t('Available once the platform is opened from its secure address.')}</Hint>;
            break;
        case 'unsupported':
            content = (
                <Hint>
                    {isIos() && !isStandalone()
                        ? t('On iPhone and iPad, add the app to the home screen first (iOS 16.4 or later), open it from there, then turn the notifications on.')
                        : t('This browser cannot receive notifications. Use a recent Chrome, Edge, Firefox or Safari.')}
                </Hint>
            );
            break;
        case 'denied':
            content = (
                <StatusLine icon={BellOff} tone="warning">
                    {t('Notifications are blocked for this site. Allow them from the site settings (the icon next to the address), then come back.')}
                </StatusLine>
            );
            break;
        default:
            content = (
                <>
                    <Switch
                        checked={push.status === 'on'}
                        onChange={toggle}
                        disabled={busy}
                        label={t('Notifications on this device')}
                        description={t('Session reminders, recitation results and halaqa messages reach you even when the app is closed.')}
                    />
                    {push.status === 'on' && (
                        <Button variant="secondary" size="sm" className="mt-3" loading={testing} onClick={test}>
                            <Send />
                            {t('Send a test notification')}
                        </Button>
                    )}
                </>
            );
    }

    return (
        <Section icon={BellRing} title={t('Notifications')}>
            {content}
        </Section>
    );
}
