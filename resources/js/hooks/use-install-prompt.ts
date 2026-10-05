import { useCallback, useState, useSyncExternalStore } from 'react';
import { clearInstallPrompt, installPrompt, isIos, isStandalone, subscribeToInstallPrompt } from '@/lib/pwa';

/**
 * prompt = the browser can install the app with one click, ios = Add to Home Screen by hand, null = nothing to offer.
 */
export type InstallMode = 'prompt' | 'ios' | null;

/**
 * Whether the platform can be installed as an app on this device, and how.
 */
export function useInstallPrompt(): { mode: InstallMode; install: () => Promise<boolean> } {
    const prompt = useSyncExternalStore(subscribeToInstallPrompt, installPrompt, () => null);
    const [manualOnIos] = useState(() => isIos() && !isStandalone());

    const install = useCallback(async (): Promise<boolean> => {
        const event = installPrompt();

        if (!event) {
            return false;
        }

        await event.prompt();
        const { outcome } = await event.userChoice;
        clearInstallPrompt();

        return outcome === 'accepted';
    }, []);

    return { mode: prompt ? 'prompt' : manualOnIos ? 'ios' : null, install };
}
