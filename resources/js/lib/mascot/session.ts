import { MASCOT_SESSION } from '@/lib/mascot/config';

/**
 * Where the show stands: the rope, the chase, or a visit by its number. `at` (a timestamp) is when that step
 * is due while the show waits for it; without `at` the step was on screen.
 */
export type CycleStep = { kind: 'rope'; at?: number } | { kind: 'chase'; at?: number } | { kind: 'visit'; index: number; at?: number };

/**
 * The day's session of the companion, kept in the browser.
 */
export interface MascotSession {
    createdAt: number;
    expiresAt: number;
    /** How many times the cycle came back to the rope since the session began. */
    cycle: number;
    step: CycleStep;
}

/**
 * What the session needs from localStorage (a Map-backed stand-in does for the tests).
 */
export interface SessionStorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

/**
 * The browser's localStorage, or nothing where it is unavailable (private mode): the show then starts over
 * on every page.
 */
export function defaultSessionStorage(): SessionStorageLike | null {
    try {
        return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
        return null;
    }
}

export function isSessionExpired(session: MascotSession, now: number): boolean {
    return now >= session.expiresAt;
}

function isStep(value: unknown): value is CycleStep {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const step = value as { kind?: unknown; index?: unknown; at?: unknown };

    if (step.at !== undefined && (typeof step.at !== 'number' || !Number.isFinite(step.at))) {
        return false;
    }

    return step.kind === 'rope' || step.kind === 'chase' || (step.kind === 'visit' && typeof step.index === 'number' && Number.isInteger(step.index) && step.index >= 0);
}

/**
 * The saved session, or null when there is none, it is unreadable, or it has expired.
 */
export function readSession(storage: SessionStorageLike | null, now: number, key: string = MASCOT_SESSION.key): MascotSession | null {
    if (!storage) {
        return null;
    }

    try {
        const raw = storage.getItem(key);

        if (!raw) {
            return null;
        }

        const value = JSON.parse(raw) as Partial<MascotSession>;

        if (
            typeof value.createdAt !== 'number' ||
            typeof value.expiresAt !== 'number' ||
            typeof value.cycle !== 'number' ||
            !isStep(value.step) ||
            value.expiresAt <= value.createdAt
        ) {
            return null;
        }

        const session: MascotSession = { createdAt: value.createdAt, expiresAt: value.expiresAt, cycle: value.cycle, step: value.step };

        return isSessionExpired(session, now) ? null : session;
    } catch {
        return null;
    }
}

export function writeSession(storage: SessionStorageLike | null, session: MascotSession, key: string = MASCOT_SESSION.key): void {
    try {
        storage?.setItem(key, JSON.stringify(session));
    } catch {
        // Storage can be full or unavailable: the show goes on, it only forgets its place on the next page.
    }
}

/**
 * A new session of a day, standing at the rope.
 */
export function createSession(storage: SessionStorageLike | null, now: number, duration: number = MASCOT_SESSION.duration, key: string = MASCOT_SESSION.key): MascotSession {
    const session: MascotSession = { createdAt: now, expiresAt: now + duration, cycle: 0, step: { kind: 'rope' } };
    writeSession(storage, session, key);

    return session;
}
