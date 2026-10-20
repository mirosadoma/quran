import { MASCOT_SESSION, MASCOT_TIMING, MASCOT_VISITS } from '@/lib/mascot/config';
import { createSession, defaultSessionStorage, isSessionExpired, readSession, type CycleStep, type MascotSession, type SessionStorageLike, writeSession } from '@/lib/mascot/session';

/**
 * What the page shows at a moment of the cycle.
 */
export type CycleState =
    | { phase: 'idle'; cycle: number }
    | { phase: 'rope'; cycle: number; leaving: boolean }
    | { phase: 'chase'; cycle: number }
    | { phase: 'waiting'; cycle: number; next: number | 'rope' | 'chase' }
    | { phase: 'visit'; cycle: number; index: number; leaving: boolean; sequence: number };

export interface CycleOptions {
    timing: typeof MASCOT_TIMING;
    /** How many visits a cycle has (the saved visit number is taken modulo this). */
    visitsCount: number;
    /** Whether this device gets the chase (a fine pointer, no wish for less motion). */
    canChase: () => boolean;
    storage: SessionStorageLike | null;
    sessionDuration: number;
    now: () => number;
}

type Listener = (state: CycleState) => void;

const IDLE: CycleState = { phase: 'idle', cycle: 0 };

function defaultCanChase(): boolean {
    return (
        typeof window !== 'undefined' &&
        'matchMedia' in window &&
        window.matchMedia('(pointer: fine)').matches &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

const defaults = (): CycleOptions => ({
    timing: MASCOT_TIMING,
    visitsCount: MASCOT_VISITS.length,
    canChase: defaultCanChase,
    storage: defaultSessionStorage(),
    sessionDuration: MASCOT_SESSION.duration,
    now: () => Date.now(),
});

/*
 * The whole cycle lives here, outside React: its state, its one pending timer and the day's session. The pages
 * only subscribe to it, so moving from page to page (Inertia) neither stops nor restarts the show.
 *
 * rope → (gap) → chase → (gap) → visit 0 → (gap) → visit 1 → … → last visit → (gap) → rope of the next cycle → …
 * Every step is written to the session as it comes; while the show waits for a step, the session holds when it
 * is due, so a refresh in the middle of a gap waits only for what is left of it.
 */
let options: CycleOptions = defaults();
let state: CycleState = IDLE;
let session: MascotSession | null = null;
let running = false;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<Listener>();

export function getCycleState(): CycleState {
    return state;
}

export function subscribeCycle(listener: Listener): () => void {
    listeners.add(listener);

    return () => {
        listeners.delete(listener);
    };
}

/**
 * Replace some of the defaults (the tests inject a fake clock, a fake storage, a smaller cycle).
 */
export function configureCycle(partial: Partial<CycleOptions>): void {
    options = { ...options, ...partial };
}

/**
 * Stop everything and forget the session: the next ensureCycleStarted() starts afresh (tests, mostly).
 */
export function resetCycle(): void {
    running = false;
    clearTimer();
    state = IDLE;
    session = null;
    listeners.clear();
    options = defaults();
}

function emit(next: CycleState): void {
    state = next;

    for (const listener of listeners) {
        listener(next);
    }
}

function clearTimer(): void {
    if (timer !== null) {
        clearTimeout(timer);
        timer = null;
    }
}

/**
 * The one pending step of the cycle; a new one replaces the previous.
 */
function after(delay: number, run: () => void): void {
    clearTimer();
    timer = setTimeout(() => {
        timer = null;

        if (running) {
            run();
        }
    }, delay);
}

function cycle(): number {
    return session?.cycle ?? 0;
}

function saveStep(step: CycleStep): void {
    if (session) {
        session.step = step;
        writeSession(options.storage, session);
    }
}

/**
 * The chase is only for the devices that can play it; the others go from the rope to the first visit.
 */
function playable(step: CycleStep): CycleStep {
    return step.kind === 'chase' && !options.canChase() ? { kind: 'visit', index: 0, at: step.at } : step;
}

/**
 * Start the show if it is not running yet: carry on from the step of the day's session, or open a new
 * session at the rope. Safe to call from every page.
 */
export function ensureCycleStarted(): void {
    if (running) {
        return;
    }

    running = true;
    const now = options.now();
    session = readSession(options.storage, now) ?? createSession(options.storage, now, options.sessionDuration);
    const step = playable(session.step);
    const { introDelay, resumeDelay } = options.timing;

    if (step.at !== undefined) {
        // It was waiting for this step: only what is left of the wait (and never less than the short resume delay).
        waitFor(step, Math.max(step.at - now, resumeDelay), step.at);
    } else if (step.kind === 'rope') {
        waitFor(step, introDelay);
    } else {
        // It was on screen: back after a short delay, without the rope flashing first.
        waitFor(step, resumeDelay);
    }
}

/**
 * Wait, then show the step. The session keeps when it is due, so a refresh meanwhile waits for the rest only.
 */
function waitFor(step: CycleStep, delay: number, dueAt: number = options.now() + delay): void {
    const next = playable(step);
    saveStep({ ...next, at: dueAt });
    emit({ phase: 'waiting', cycle: cycle(), next: next.kind === 'visit' ? next.index % Math.max(options.visitsCount, 1) : next.kind });
    after(delay, () => show(next));
}

function show(step: CycleStep): void {
    switch (step.kind) {
        case 'rope':
            showRope();
            break;
        case 'chase':
            showChase();
            break;
        case 'visit':
            showVisit(step.index);
            break;
    }
}

function showRope(): void {
    const { timing } = options;
    const now = options.now();

    // The day is over while the page stayed open: a new session, the cycles counted from zero.
    if (!session || isSessionExpired(session, now)) {
        session = createSession(options.storage, now, options.sessionDuration);
    }

    saveStep({ kind: 'rope' });
    emit({ phase: 'rope', cycle: cycle(), leaving: false });

    after(timing.introDuration, () => {
        emit({ phase: 'rope', cycle: cycle(), leaving: true });
        after(timing.introExit, () => waitFor({ kind: 'chase' }, timing.gap));
    });
}

function showChase(): void {
    saveStep({ kind: 'chase' });
    emit({ phase: 'chase', cycle: cycle() });
    armChaseTimeout();
}

function armChaseTimeout(): void {
    after(options.timing.chaseTimeout, () => finishChase());
}

/**
 * The chase lantern disappeared (or never reported back): the first visit comes after the gap.
 * Ignored outside the chase.
 */
export function finishChase(): void {
    if (!running || state.phase !== 'chase') {
        return;
    }

    waitFor({ kind: 'visit', index: 0 }, options.timing.gap);
}

/**
 * A page mounted during the chase: give its lantern the whole time again before the cycle moves on alone.
 */
export function restartChaseTimeout(): void {
    if (running && state.phase === 'chase') {
        armChaseTimeout();
    }
}

function showVisit(rawIndex: number): void {
    const count = options.visitsCount;

    if (count === 0) {
        waitForNextCycle();

        return;
    }

    const index = rawIndex % count;
    const sequence = cycle() * count + index + 1;
    saveStep({ kind: 'visit', index });
    emit({ phase: 'visit', cycle: cycle(), index, leaving: false, sequence });

    after(options.timing.visible, () => leaveVisit(index, sequence));
}

function leaveVisit(index: number, sequence: number): void {
    emit({ phase: 'visit', cycle: cycle(), index, leaving: true, sequence });

    after(options.timing.exit, () => {
        if (index + 1 >= options.visitsCount) {
            waitForNextCycle();
        } else {
            waitFor({ kind: 'visit', index: index + 1 }, options.timing.gap);
        }
    });
}

/**
 * After the last visit: the same gap, then the rope of the next cycle.
 */
function waitForNextCycle(): void {
    if (session) {
        session.cycle += 1;
    }

    waitFor({ kind: 'rope' }, options.timing.gap);
}

/**
 * Hide the visible lantern now (a tap on it); the next one comes after the gap as usual.
 */
export function skipVisit(): void {
    if (running && state.phase === 'visit' && !state.leaving) {
        clearTimer();
        leaveVisit(state.index, state.sequence);
    }
}
