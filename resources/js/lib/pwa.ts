import { router } from '@inertiajs/react';

/**
 * Installable app (PWA): registers the service worker and keeps the browser's
 * install prompt so the "Install app" button can show it later.
 */

export interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify(): void {
    listeners.forEach((listener) => listener());
}

export function subscribeToInstallPrompt(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function installPrompt(): BeforeInstallPromptEvent | null {
    return deferredPrompt;
}

/**
 * The browser allows each prompt to be shown only once.
 */
export function clearInstallPrompt(): void {
    deferredPrompt = null;
    notify();
}

/**
 * Opened from the home screen / app list rather than a browser tab.
 */
export function isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * iPhone and iPad (iPadOS reports itself as a Mac with a touch screen) have no install prompt.
 */
export function isIos(): boolean {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
}

export function setupPwa(): void {
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event as BeforeInstallPromptEvent;
        notify();
    });

    window.addEventListener('appinstalled', clearInstallPrompt);

    // A push notification arrived while the app is open: refresh the unread counters.
    navigator.serviceWorker?.addEventListener('message', (event: MessageEvent<{ type?: string }>) => {
        if (event.data?.type === 'push') {
            router.reload({ only: ['counts'] });
        }
    });

    // Production builds only: during development Vite serves the assets and a worker would only get in the way.
    if (!import.meta.env.PROD || !('serviceWorker' in navigator) || !window.isSecureContext) {
        return;
    }

    const register = () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {
            // Without the worker everything still works; only the offline page is missing.
        });
    };

    if (document.readyState === 'complete') {
        register();
    } else {
        window.addEventListener('load', register, { once: true });
    }
}
