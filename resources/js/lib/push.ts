import { router } from '@inertiajs/react';
import { http } from '@/lib/http';
import type { FirebaseWebConfig } from '@/types';

/**
 * Push notifications on this device, delivered by Firebase Cloud Messaging. The browser subscribes
 * with the Web Push key of the Firebase project, Firebase gives the subscription a token, and the
 * server stores the token and pushes every notification of the user to it, even while the app is
 * closed. The platform's own service worker (/sw.js) shows the notifications.
 *
 * checking = not known yet, unconfigured = the platform has no Firebase settings (or push is turned
 * off), insecure = not opened over HTTPS, unsupported = the browser cannot receive push,
 * denied = the user blocked notifications, off / on = this device's state.
 */
export type PushStatus = 'checking' | 'unconfigured' | 'insecure' | 'unsupported' | 'denied' | 'off' | 'on';

const SYNCED_PREFIX = 'push-token:';

let status: PushStatus = 'checking';
let currentToken: string | null = null;
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
 * Whether a subscription was made with this key (it may come from the platform's former VAPID
 * keys, or the Firebase keys may have been replaced).
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

/**
 * Firebase is loaded only when a token is needed, so it stays out of the main bundle.
 */
async function firebaseMessaging(config: FirebaseWebConfig) {
    const [{ getApps, initializeApp }, { getMessaging, getToken, deleteToken }] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);

    const app =
        getApps().find((item) => item.name === config.appId) ??
        initializeApp({ apiKey: config.apiKey, projectId: config.projectId, appId: config.appId, messagingSenderId: config.messagingSenderId }, config.appId);

    return { messaging: getMessaging(app), getToken, deleteToken };
}

/**
 * The Firebase token of this device. A subscription made with another key is dropped first:
 * Firebase would take it as it is and its messages would never arrive.
 */
async function requestToken(registration: ServiceWorkerRegistration, config: FirebaseWebConfig): Promise<string> {
    const existing = await registration.pushManager.getSubscription();

    if (existing && !usesKey(existing, config.vapidKey)) {
        await existing.unsubscribe();
    }

    const { messaging, getToken } = await firebaseMessaging(config);

    return getToken(messaging, { vapidKey: config.vapidKey, serviceWorkerRegistration: registration });
}

async function saveOnServer(token: string): Promise<void> {
    await http.post(route('push-subscriptions.store'), { token });
    currentToken = token;
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

export async function refreshPushStatus(config: FirebaseWebConfig | null): Promise<PushStatus> {
    if (!config) {
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

        return setStatus(subscription && Notification.permission === 'granted' ? 'on' : 'off');
    } catch {
        return setStatus('off');
    }
}

/**
 * Ask for permission and register this device. Must run from a click: browsers only show the
 * permission prompt in response to the user.
 */
export async function enablePush(config: FirebaseWebConfig): Promise<'on' | 'denied' | 'dismissed'> {
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
        await refreshPushStatus(config);

        return permission === 'denied' ? 'denied' : 'dismissed';
    }

    await saveOnServer(await requestToken(await activeRegistration(), config));
    setStatus('on');

    return 'on';
}

export async function disablePush(config: FirebaseWebConfig | null): Promise<void> {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    let token = currentToken;

    if (registration && subscription && config && usesKey(subscription, config.vapidKey)) {
        try {
            const { messaging, getToken, deleteToken } = await firebaseMessaging(config);
            // Firebase reads the token from its local store; deleting it also unsubscribes the browser.
            token = await getToken(messaging, { vapidKey: config.vapidKey, serviceWorkerRegistration: registration });
            await deleteToken(messaging);
        } catch {
            // Firebase is unreachable: unsubscribing below still stops the notifications.
        }
    }

    if (token) {
        await http.delete(route('push-subscriptions.destroy'), { data: { token } });
    }

    await (await currentSubscription())?.unsubscribe();

    currentToken = null;
    forgetSynced();
    setStatus('off');
}

/**
 * @returns the user's devices, and how many of them Firebase accepted the test for
 */
export async function sendTestPush(): Promise<{ devices: number; delivered: number }> {
    const { data } = await http.post<{ devices: number; delivered: number }>(route('push-subscriptions.test'));

    return data;
}

/**
 * Once per browser session and user: send this device's token to the server again, so a renewed
 * token, replaced keys or another account signing in on the device are picked up. Devices that
 * subscribed before the platform moved to Firebase get their token here too.
 */
export async function syncPushSubscription(config: FirebaseWebConfig | null, userId: number): Promise<void> {
    if ((await refreshPushStatus(config)) !== 'on' || !config) {
        return;
    }

    const key = SYNCED_PREFIX + userId;

    try {
        const synced = sessionStorage.getItem(key);

        if (synced) {
            currentToken = synced;

            return;
        }

        const registration = await navigator.serviceWorker.getRegistration();

        if (!registration) {
            return;
        }

        const token = await requestToken(registration, config);

        await saveOnServer(token);
        sessionStorage.setItem(key, token);
    } catch {
        await refreshPushStatus(config);
    }
}

/**
 * Sign out and stop pushing this account's notifications to this device.
 */
export function signOut(): void {
    forgetSynced();
    router.post(route('logout'), currentToken ? { push_token: currentToken } : {});
}
