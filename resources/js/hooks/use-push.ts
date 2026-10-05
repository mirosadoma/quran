import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { enablePush, pushStatus, refreshPushStatus, subscribeToPushStatus, type PushStatus } from '@/lib/push';

/**
 * State of push notifications on this device, and turning them on.
 */
export function usePush(): {
    status: PushStatus;
    publicKey: string | null;
    refresh: () => Promise<PushStatus>;
    enable: () => Promise<'on' | 'denied' | 'dismissed'>;
} {
    const publicKey = usePage().props.push?.public_key ?? null;
    const status = useSyncExternalStore(subscribeToPushStatus, pushStatus, () => 'checking' as PushStatus);

    const refresh = useCallback(() => refreshPushStatus(publicKey), [publicKey]);

    const enable = useCallback(async () => {
        if (!publicKey) {
            return 'dismissed' as const;
        }

        return enablePush(publicKey);
    }, [publicKey]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    return { status, publicKey, refresh, enable };
}
