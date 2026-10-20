import { CHASE_TIMING } from '@/lib/mascot/config';

export type ChasePhase = 'hidden' | 'pop' | 'chase' | 'eat' | 'fall' | 'done';

export interface Point {
    x: number;
    y: number;
}

/**
 * Where the lantern is and how it runs, every frame: the top-left corner of its box, the lean (degrees),
 * the hop (pixels up) and the stretch (-1 squashed … 1 stretched).
 */
export interface ChaseFrame {
    x: number;
    y: number;
    tilt: number;
    hop: number;
    stretch: number;
}

/**
 * The size of the lantern's box (pixels) and where its mouth is inside it (fractions of the box).
 */
export interface ChaseActor {
    width: number;
    height: number;
    mouthX: number;
    mouthY: number;
}

/**
 * What the chase needs from the page: the clock, the frames, the size of the window, where to pop up,
 * and what to draw. The page wires it to the DOM; the tests wire it to fake timers.
 */
export interface ChaseHost {
    now(): number;
    requestFrame(callback: () => void): number;
    cancelFrame(id: number): void;
    viewport(): { width: number; height: number };
    /** The top-left corner of the box where the lantern pops up. */
    entry(): Point;
    onPhase(phase: ChasePhase): void;
    /** The jaws open (true) or the grin is back (false); called only when it changes. */
    onMouth(open: boolean): void;
    onFrame(frame: ChaseFrame): void;
    /** Hide the real pointer (true) and bring it back (false). */
    onCursorHidden(hidden: boolean): void;
    /** The meal begins: the pointer (a fake one from now on) slides from `cursor` into the `mouth`. */
    onEat(cursor: Point, mouth: Point): void;
    onChomp(): void;
    /** The pit opens (true) or closes (false) under the `feet`. */
    onPit(open: boolean, feet: Point): void;
    /** The lantern drops into the open pit. */
    onFall(): void;
    onDone(): void;
}

export interface ChaseHandle {
    start(): void;
    pointerMoved(x: number, y: number): void;
    /** Cancel everything (the page is left): frames, timers, and the real pointer comes back. */
    stop(): void;
    phase(): ChasePhase;
}

/** The lantern of the chase is 5rem tall; its mouth is a little below the middle of its face. */
export const CHASE_ACTOR: ChaseActor = { width: 80 * (100 / 120), height: 80, mouthX: 0.5, mouthY: 0.58 };

/**
 * The chase, free of React and of the DOM: it pops up, runs after the pointer frame by frame (the speed holds
 * whatever the frame rate), opens its jaws when close, eats the pointer when it reaches it, then falls into a
 * pit; or gives up and falls when the pointer stays still or the chase lasts too long.
 */
export function createChase(host: ChaseHost, timing: typeof CHASE_TIMING = CHASE_TIMING, actor: ChaseActor = CHASE_ACTOR): ChaseHandle {
    let phase: ChasePhase = 'hidden';
    let pointer: Point | null = null;
    let position: Point = { x: 0, y: 0 };
    let lastMoveAt = 0;
    let chaseStartedAt = 0;
    let lastFrameAt = 0;
    let runTime = 0;
    let facing = 1;
    let jawsOpen = false;
    let cursorHidden = false;
    let done = false;
    let stopped = false;
    let frame: number | null = null;
    const timers = new Set<ReturnType<typeof setTimeout>>();

    const after = (delay: number, run: () => void): void => {
        const id = setTimeout(() => {
            timers.delete(id);

            if (!stopped) {
                run();
            }
        }, delay);
        timers.add(id);
    };

    const setPhase = (next: ChasePhase): void => {
        phase = next;
        host.onPhase(next);
    };

    const setJaws = (open: boolean): void => {
        if (jawsOpen !== open) {
            jawsOpen = open;
            host.onMouth(open);
        }
    };

    const cancelFrame = (): void => {
        if (frame !== null) {
            host.cancelFrame(frame);
            frame = null;
        }
    };

    const restoreCursor = (): void => {
        if (cursorHidden) {
            cursorHidden = false;
            host.onCursorHidden(false);
        }
    };

    const mouth = (): Point => ({ x: position.x + actor.width * actor.mouthX, y: position.y + actor.height * actor.mouthY });
    const feet = (): Point => ({ x: position.x + actor.width / 2, y: position.y + actor.height });

    const finish = (): void => {
        if (done) {
            return;
        }

        done = true;
        setPhase('done');
        host.onDone();
    };

    /** The pit opens under its feet, it drops in with its mouth shut, the pit closes, and it is gone. */
    const fall = (): void => {
        cancelFrame();
        setJaws(false);
        setPhase('fall');
        const at = feet();
        host.onPit(true, at);

        after(timing.pitOpen, () => {
            host.onFall();

            after(timing.fall, () => {
                host.onPit(false, at);
                after(timing.pitClose, finish);
            });
        });
    };

    const eat = (cursor: Point): void => {
        cancelFrame();
        setPhase('eat');
        setJaws(true);
        cursorHidden = true;
        host.onCursorHidden(true);
        host.onEat(cursor, mouth());

        after(timing.chompAt, () => {
            host.onChomp();
            setJaws(false);

            after(timing.chompGap, () => {
                setJaws(true);
                after(timing.chompGap, () => setJaws(false));
            });
        });

        after(timing.eatDuration, () => {
            restoreCursor();
            fall();
        });
    };

    const tick = (): void => {
        frame = null;

        if (phase !== 'chase' || stopped) {
            return;
        }

        const now = host.now();
        // Capped: a tab left in the background must not teleport the lantern when it comes back.
        const dt = Math.min(Math.max(now - lastFrameAt, 0), 50) / 1000;
        lastFrameAt = now;
        runTime += dt;

        if (now - lastMoveAt >= timing.idleTimeout || now - chaseStartedAt >= timing.maxDuration) {
            fall();

            return;
        }

        let moving = false;
        let lean = 0;

        if (pointer) {
            const from = mouth();
            const dx = pointer.x - from.x;
            const dy = pointer.y - from.y;
            const distance = Math.hypot(dx, dy);

            if (distance <= timing.catchRadius) {
                eat(pointer);

                return;
            }

            setJaws(distance < timing.jawsDistance);

            const step = Math.min(timing.speed * dt, distance);

            if (step > 0) {
                const { width, height } = host.viewport();
                position = {
                    x: Math.min(Math.max(position.x + (dx / distance) * step, 0), Math.max(width - actor.width, 0)),
                    y: Math.min(Math.max(position.y + (dy / distance) * step, 0), Math.max(height - actor.height, 0)),
                };
                moving = true;
                facing = dx >= 0 ? 1 : -1;
                lean = facing * timing.tilt * Math.min(1, Math.abs(dx) / 60);
            }
        }

        const beat = Math.sin(runTime * Math.PI * 2 * timing.bounceHz);
        host.onFrame({
            x: position.x,
            y: position.y,
            tilt: lean,
            hop: moving ? Math.abs(beat) * timing.hop : 0,
            stretch: moving ? beat : 0.15 * Math.sin(runTime * Math.PI * 2 * 0.8),
        });

        frame = host.requestFrame(tick);
    };

    return {
        start() {
            position = host.entry();
            host.onFrame({ x: position.x, y: position.y, tilt: 0, hop: 0, stretch: 0 });
            setPhase('pop');

            after(timing.enter, () => {
                setPhase('chase');
                chaseStartedAt = host.now();
                lastFrameAt = chaseStartedAt;
                lastMoveAt = chaseStartedAt;
                frame = host.requestFrame(tick);
            });
        },
        pointerMoved(x, y) {
            pointer = { x, y };
            lastMoveAt = host.now();
        },
        stop() {
            stopped = true;
            cancelFrame();

            for (const id of timers) {
                clearTimeout(id);
            }

            timers.clear();
            restoreCursor();
        },
        phase: () => phase,
    };
}
