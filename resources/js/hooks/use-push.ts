import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { enablePush, pushStatus, refreshPushStatus, subscribeToPushStatus, type PushStatus } from '@/lib/push';
import type { FirebaseWebConfig } from '@/types';

/**
 * The Firebase settings shared by the server. Every visit brings new props: the same object is
 * kept while the settings do not change.
 */
export function useFirebaseConfig(): FirebaseWebConfig | null {
    const shared = usePage().props.push?.firebase ?? null;
    const signature = shared ? JSON.stringify(shared) : null;

    return useMemo(() => (signature ? (JSON.parse(signature) as FirebaseWebConfig) : null), [signature]);
}

/**
 * State of push notifications on this device, and turning them on.
 */
export function usePush(): {
    status: PushStatus;
    config: FirebaseWebConfig | null;
    refresh: () => Promise<PushStatus>;
    enable: () => Promise<'on' | 'denied' | 'dismissed'>;
} {
    const config = useFirebaseConfig();
    const status = useSyncExternalStore(subscribeToPushStatus, pushStatus, () => 'checking' as PushStatus);

    const refresh = useCallback(() => refreshPushStatus(config), [config]);

    const enable = useCallback(async () => {
        if (!config) {
            return 'dismissed' as const;
        }

        return enablePush(config);
    }, [config]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { status, config, refresh, enable };
}
