import { router } from '@inertiajs/react';
import { http } from '@/lib/http';

/**
 * Push notifications on this device. The browser subscribes with the platform's public (VAPID)
 * key and the server stores the subscription, then pushes every notification of the user to it,
 * even while the app is closed.
 *
 * checking = not known yet, unconfigured = the platform has no keys (or push is turned off),
 * insecure = not opened over HTTPS, unsupported = the browser cannot receive push,
 * denied = the user blocked notifications, off / on = this device's state.
 */
export type PushStatus = 'checking' | 'unconfigured' | 'insecure' | 'unsupported' | 'denied' | 'off' | 'on';

const SYNCED_PREFIX = 'push-synced:';

let status: PushStatus = 'checking';
let currentEndpoint: string | null = null;
const listeners = new Set<() => void>();

function setStatus(next: PushStatus): PushStatus {
    if (next !== status) {
        status = next;
        listeners.forEach((listener) => listener());
    }

    return status;
}

export function subscribeToPushStatus(listener: () => void): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

export function pushStatus(): PushStatus {
    return status;
}

export function isPushSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function decodeKey(key: string): Uint8Array<ArrayBuffer> {
    const base64 = (key + '='.repeat((4 - (key.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const bytes = new Uint8Array(new ArrayBuffer(raw.length));

    for (let i = 0; i < raw.length; i++) {
        bytes[i] = raw.charCodeAt(i);
    }

    return bytes;
}

/**
 * Whether a subscription was made with this key (the keys may have been replaced on the server).
 */
function usesKey(subscription: PushSubscription, key: string): boolean {
    const used = subscription.options?.applicationServerKey;

    if (!used) {
        return true;
    }

    const expected = decodeKey(key);
    const actual = new Uint8Array(used);

    return actual.length === expected.length && actual.every((byte, index) => byte === expected[index]);
}

async function currentSubscription(): Promise<PushSubscription | null> {
    const registration = await navigator.serviceWorker.getRegistration();

    return (await registration?.pushManager.getSubscription()) ?? null;
}

/**
 * The worker is registered on load in production builds; elsewhere it is registered on demand.
 */
async function activeRegistration(): Promise<ServiceWorkerRegistration> {
    if (!(await navigator.serviceWorker.getRegistration())) {
        await navigator.serviceWorker.register('/sw.js');
    }

    return navigator.serviceWorker.ready;
}

async function subscribe(registration: ServiceWorkerRegistration, publicKey: string): Promise<PushSubscription> {
    const existing = await registration.pushManager.getSubscription();

    if (existing && usesKey(existing, publicKey)) {
        return existing;
    }

    await existing?.unsubscribe();

    return registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(publicKey) });
}

async function saveOnServer(subscription: PushSubscription): Promise<void> {
    await http.post(route('push-subscriptions.store'), subscription.toJSON());
    currentEndpoint = subscription.endpoint;
}

function forgetSynced(): void {
    try {
        Object.keys(sessionStorage)
            .filter((key) => key.startsWith(SYNCED_PREFIX))
            .forEach((key) => sessionStorage.removeItem(key));
    } catch {
        // Storage can be unavailable (private mode); syncing again is harmless.
    }
}

export async function refreshPushStatus(publicKey: string | null): Promise<PushStatus> {
    if (!publicKey) {
        return setStatus('unconfigured');
    }

    if (!window.isSecureContext) {
        return setStatus('insecure');
    }

    if (!isPushSupported()) {
        return setStatus('unsupported');
    }

    if (Notification.permission === 'denied') {
        return setStatus('denied');
    }

    try {
        const subscription = await currentSubscription();
        currentEndpoint = subscription?.endpoint ?? null;

        return setStatus(subscription && Notification.permission === 'granted' ? 'on' : 'off');
    } catch {
        return setStatus('off');
    }
}

/**
 * Ask for permission and subscribe this device. Must run from a click: browsers only show the
 * permission prompt in response to the user.
 */
export async function enablePush(publicKey: string): Promise<'on' | 'denied' | 'dismissed'> {
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
        await refreshPushStatus(publicKey);

        return permission === 'denied' ? 'denied' : 'dismissed';
    }

    await saveOnServer(await subscribe(await activeRegistration(), publicKey));
    setStatus('on');

    return 'on';
}

export async function disablePush(): Promise<void> {
    const subscription = await currentSubscription();

    if (subscription) {
        await http.delete(route('push-subscriptions.destroy'), { data: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
    }

    currentEndpoint = null;
    forgetSynced();
    setStatus('off');
}

/**
 * @returns the number of devices the test was sent to
 */
export async function sendTestPush(): Promise<number> {
    const { data } = await http.post<{ devices: number }>(route('push-subscriptions.test'));

    return data.devices;
}

/**
 * Once per browser session and user: send this device's subscription to the server again, so a
 * renewed subscription, replaced keys or another account signing in on the device are picked up.
 */
export async function syncPushSubscription(publicKey: string | null, userId: number): Promise<void> {
    if ((await refreshPushStatus(publicKey)) !== 'on' || !publicKey) {
        return;
    }

    try {
        const registration = await navigator.serviceWorker.getRegistration();

        if (!registration) {
            return;
        }

        const subscription = await subscribe(registration, publicKey);
        const key = SYNCED_PREFIX + userId;

        if (sessionStorage.getItem(key) === subscription.endpoint) {
            currentEndpoint = subscription.endpoint;

            return;
        }

        await saveOnServer(subscription);
        sessionStorage.setItem(key, subscription.endpoint);
    } catch {
        await refreshPushStatus(publicKey);
    }
}

/**
 * Sign out and stop pushing this account's notifications to this device.
 */
export function signOut(): void {
    forgetSynced();
    router.post(route('logout'), currentEndpoint ? { push_endpoint: currentEndpoint } : {});
}
