import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import type { ChatMessage, RealtimeConfig } from '@/types';

export type RealtimeEvent = 'notification' | 'message' | 'message-deleted' | 'session';

type AuthCallback = (error: Error | null, data: unknown) => void;

let echo: Echo<'pusher'> | null = null;
let connectionKey: string | null = null;
let userChannel: string | null = null;
const halaqaChannels = new Set<number>();
const events = new EventTarget();

/**
 * Authorize private/presence channels with axios, which always sends the
 * current XSRF cookie (the CSRF meta tag can be stale in an SPA).
 */
function authorize({ socketId, channelName }: { socketId: string; channelName: string }, callback: AuthCallback): void {
    axios
        .post('/broadcasting/auth', { socket_id: socketId, channel_name: channelName }, { headers: { Accept: 'application/json' } })
        .then((response) => callback(null, response.data))
        .catch((error: unknown) => callback(error instanceof Error ? error : new Error('Unauthorized'), null));
}

function emit(event: RealtimeEvent, payload: unknown): void {
    events.dispatchEvent(new CustomEvent(event, { detail: payload }));
}

export function getEcho(config: RealtimeConfig): Echo<'pusher'> | null {
    if (!config.enabled || !config.key) {
        disconnectRealtime();

        return null;
    }

    const key = [config.broadcaster, config.key, config.cluster, config.host, config.port, config.scheme].join('|');

    if (echo && connectionKey === key) {
        return echo;
    }

    disconnectRealtime();

    const common = {
        key: config.key,
        Pusher,
        channelAuthorization: { endpoint: '/broadcasting/auth', transport: 'ajax' as const, customHandler: authorize },
    };

    echo = (
        config.broadcaster === 'reverb'
            ? new Echo({
                  ...common,
                  broadcaster: 'reverb',
                  wsHost: config.host,
                  wsPort: config.port,
                  wssPort: config.port,
                  forceTLS: config.scheme === 'https',
                  enabledTransports: ['ws', 'wss'],
              })
            : new Echo({ ...common, broadcaster: 'pusher', cluster: config.cluster, forceTLS: true })
    ) as Echo<'pusher'>;

    connectionKey = key;

    return echo;
}

export function disconnectRealtime(): void {
    echo?.disconnect();
    echo = null;
    connectionKey = null;
    userChannel = null;
    halaqaChannels.clear();
}

export function socketId(): string | undefined {
    return echo?.socketId();
}

/**
 * Listen to a realtime event; returns the unsubscribe function.
 */
export function onRealtime(event: RealtimeEvent, handler: (payload: never) => void): () => void {
    const listener = (event: Event) => (handler as (payload: unknown) => void)((event as CustomEvent).detail);
    events.addEventListener(event, listener);

    return () => events.removeEventListener(event, listener);
}

/**
 * Subscribe once to the user's notifications and to the channels of their halaqat.
 */
export function syncRealtime(config: RealtimeConfig, userId: number | null): void {
    if (userId === null) {
        disconnectRealtime();

        return;
    }

    const instance = getEcho(config);

    if (!instance) {
        return;
    }

    const channel = `App.Models.User.${userId}`;

    if (userChannel !== channel) {
        if (userChannel) {
            instance.leaveChannel(`private-${userChannel}`);
        }

        instance.private(channel).notification((notification: unknown) => emit('notification', notification));
        userChannel = channel;
    }

    config.halaqa_ids.forEach((id) => watchHalaqa(config, id));
}

/**
 * Receive chat and session events of a halaqa.
 */
export function watchHalaqa(config: RealtimeConfig, halaqaId: number): void {
    const instance = getEcho(config);

    if (!instance || halaqaChannels.has(halaqaId)) {
        return;
    }

    instance
        .private(`halaqa.${halaqaId}`)
        .listen('.message.sent', (event: { message: ChatMessage }) => emit('message', event.message))
        .listen('.message.deleted', (event: { id: number }) => emit('message-deleted', { id: event.id, halaqa_id: halaqaId }))
        .listen('.session.updated', (event: { id: number; status: string }) => emit('session', { ...event, halaqa_id: halaqaId }));

    halaqaChannels.add(halaqaId);
}

export function joinPresence(config: RealtimeConfig, halaqaId: number) {
    return getEcho(config)?.join(`halaqa.${halaqaId}`) ?? null;
}

export function leavePresence(halaqaId: number): void {
    echo?.leaveChannel(`presence-halaqa.${halaqaId}`);
}
