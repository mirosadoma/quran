import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { LogoMark } from '@/components/brand';
import { LoaderBuddy } from '@/components/mascot/loader-buddy';
import { companionShownOn } from '@/hooks/use-companion';
import { cn } from '@/lib/utils';

/**
 * A page change shorter than this shows only the progress bar; a longer one shows the loading screen.
 */
export const LOADING_SCREEN_DELAY = 600;

interface LoadingScreenProps {
    /** The name of the platform, under the logo. */
    name: string;
    logoUrl?: string | null;
    /** "Loading…" in the language of the page. */
    label: string;
    /** A small loader for a part of a page instead of the whole screen. */
    compact?: boolean;
    /** The companion over the logo (unless the administration hid it there). */
    companion?: boolean;
    className?: string;
}

/**
 * The loading screen: the companion pondering right above the logo of the platform.
 */
export function LoadingScreen({ name, logoUrl, label, compact = false, companion = true, className }: LoadingScreenProps) {
    const logo = logoUrl ? (
        <img src={logoUrl} alt={name} className={cn('rounded-xl object-cover', compact ? 'size-9' : 'size-14 rounded-2xl')} />
    ) : (
        <LogoMark className={cn(compact ? 'size-9' : 'size-14 rounded-2xl')} />
    );

    if (compact) {
        return (
            <div className={cn('flex flex-col items-center gap-2 py-6 text-center', className)} role="status" aria-live="polite" data-loading-screen="compact">
                {companion && <LoaderBuddy compact />}
                {logo}
                <p className="text-xs text-muted">{label}</p>
            </div>
        );
    }

    return (
        <div
            className={cn('fixed inset-0 z-[70] flex flex-col items-center justify-center gap-3 bg-canvas/85 px-6 text-center backdrop-blur-sm animate-fade-in', className)}
            role="status"
            aria-live="polite"
            data-loading-screen="full"
        >
            {companion && <LoaderBuddy />}
            {logo}
            <p className="font-quran text-xl font-bold text-ink">{name}</p>
            <p className="text-sm text-muted">{label}</p>
        </div>
    );
}

interface NavigationLoaderProps {
    name: string;
    logoUrl?: string | null;
    /** Called when the screen shows, so the label follows the current language. */
    label: () => string;
    /** Whether the companion shows on the first page; the next pages tell it themselves. */
    companion: boolean;
}

/**
 * Shows the loading screen during the page changes that take longer than LOADING_SCREEN_DELAY
 * (plain page visits only: not the partial reloads of the counters, nor the prefetches, nor the forms).
 */
export function NavigationLoader({ name, logoUrl, label, companion: initialCompanion }: NavigationLoaderProps) {
    const [visible, setVisible] = useState(false);
    const [companion, setCompanion] = useState(initialCompanion);

    // The loader lives outside the pages: it follows the companion of the page being left.
    useEffect(() => router.on('navigate', (event) => setCompanion(companionShownOn(event.detail.page))), []);

    useEffect(() => {
        let timer: number | null = null;

        const clear = () => {
            if (timer !== null) {
                window.clearTimeout(timer);
                timer = null;
            }
        };

        const offStart = router.on('start', (event) => {
            const visit = event.detail.visit;

            if (visit.method !== 'get' || visit.only.length > 0 || visit.prefetch || visit.async) {
                return;
            }

            clear();
            timer = window.setTimeout(() => setVisible(true), LOADING_SCREEN_DELAY);
        });

        const offFinish = router.on('finish', () => {
            clear();
            setVisible(false);
        });

        return () => {
            offStart();
            offFinish();
            clear();
        };
    }, []);

    if (!visible) {
        return null;
    }

    return <LoadingScreen name={name} logoUrl={logoUrl} label={label()} companion={companion} />;
}
