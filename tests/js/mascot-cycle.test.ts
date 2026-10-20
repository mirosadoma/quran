import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { MASCOT_SESSION, MASCOT_TIMING } from '@/lib/mascot/config';
import { configureCycle, type CycleState, ensureCycleStarted, finishChase, getCycleState, resetCycle, skipVisit, subscribeCycle } from '@/lib/mascot/cycle';
import { memoryStorage } from './mascot-session.test';

/** The numbers of these tests, whatever the page's settings are. */
const timing = { ...MASCOT_TIMING, introDelay: 400, introDuration: 5000, introExit: 700, resumeDelay: 600, visible: 5000, gap: 60000, exit: 500, chaseTimeout: 30000 };
const VISITS = 3;
const DAY = MASCOT_SESSION.duration;
const ROPE = timing.introDuration + timing.introExit;

/**
 * Move the fake clock forward in small steps: Node's mock timers run, in one tick, only the timers that
 * already existed when the tick began, and the cycle schedules each step from the previous one.
 */
function advance(ms: number): void {
    const step = 50;

    for (let elapsed = 0; elapsed < ms; elapsed += step) {
        mock.timers.tick(Math.min(step, ms - elapsed));
    }
}

function setup({ canChase = true, storage = memoryStorage(), sessionDuration = DAY } = {}) {
    const states: CycleState[] = [];
    configureCycle({ timing, visitsCount: VISITS, canChase: () => canChase, storage, sessionDuration, now: () => Date.now() });
    subscribeCycle((state) => states.push(state));

    return {
        states,
        storage,
        phases: () => states.map((state) => (state.phase === 'visit' ? `visit${state.index}${state.leaving ? '-' : ''}` : state.phase === 'rope' ? `rope${state.leaving ? '-' : ''}` : state.phase === 'waiting' ? `wait:${state.next}` : state.phase)),
    };
}

function saved(storage: ReturnType<typeof memoryStorage>) {
    return JSON.parse(storage.map.get(MASCOT_SESSION.key) ?? '{}');
}

describe('the cycle of the companion', () => {
    beforeEach(() => {
        mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_700_000_000_000 });
        resetCycle();
    });

    afterEach(() => {
        resetCycle();
        mock.timers.reset();
    });

    it('runs the rope, the chase and the visits with the same gap between every two, then the rope and the chase again', () => {
        const { storage, phases } = setup();
        ensureCycleStarted();

        assert.deepEqual(getCycleState(), { phase: 'waiting', cycle: 0, next: 'rope' });
        advance(timing.introDelay);
        assert.deepEqual(getCycleState(), { phase: 'rope', cycle: 0, leaving: false });
        assert.deepEqual(saved(storage).step, { kind: 'rope' });
        advance(timing.introDuration);
        assert.deepEqual(getCycleState(), { phase: 'rope', cycle: 0, leaving: true });
        advance(timing.introExit);
        assert.deepEqual(getCycleState(), { phase: 'waiting', cycle: 0, next: 'chase' }, 'the rope is gone: the gap before the chase');
        assert.deepEqual(saved(storage).step, { kind: 'chase', at: Date.now() + timing.gap });

        advance(timing.gap - 1);
        assert.equal(getCycleState().phase, 'waiting', 'no chase before the whole gap');
        mock.timers.tick(1);
        assert.deepEqual(getCycleState(), { phase: 'chase', cycle: 0 });
        assert.deepEqual(saved(storage).step, { kind: 'chase' });

        finishChase();
        assert.deepEqual(getCycleState(), { phase: 'waiting', cycle: 0, next: 0 }, 'the chase is over: the gap before the first visit');
        advance(timing.gap - 1);
        assert.equal(getCycleState().phase, 'waiting');
        mock.timers.tick(1);
        assert.deepEqual(getCycleState(), { phase: 'visit', cycle: 0, index: 0, leaving: false, sequence: 1 });

        const visitCycle = timing.visible + timing.exit + timing.gap;

        for (let index = 1; index < VISITS; index++) {
            advance(visitCycle);
            assert.deepEqual(getCycleState(), { phase: 'visit', cycle: 0, index, leaving: false, sequence: index + 1 });
            assert.deepEqual(saved(storage).step, { kind: 'visit', index });
        }

        advance(timing.visible + timing.exit);
        assert.deepEqual(getCycleState(), { phase: 'waiting', cycle: 1, next: 'rope' }, 'after the last visit, the same gap, then the rope of the next cycle');
        assert.equal(saved(storage).cycle, 1);
        advance(timing.gap);
        assert.deepEqual(getCycleState(), { phase: 'rope', cycle: 1, leaving: false });
        advance(ROPE + timing.gap);
        assert.deepEqual(getCycleState(), { phase: 'chase', cycle: 1 }, 'the chase again');

        finishChase();
        advance(timing.gap);
        assert.deepEqual(getCycleState(), { phase: 'visit', cycle: 1, index: 0, leaving: false, sequence: VISITS + 1 });
        assert.deepEqual(phases().slice(0, 10), ['wait:rope', 'rope', 'rope-', 'wait:chase', 'chase', 'wait:0', 'visit0', 'visit0-', 'wait:1', 'visit1']);
    });

    it('keeps a visit for exactly the visible time, then waits the whole gap', () => {
        setup({ canChase: false });
        ensureCycleStarted();
        advance(timing.introDelay + ROPE + timing.gap);
        assert.equal(getCycleState().phase, 'visit');

        advance(timing.visible - 1);
        assert.deepEqual(getCycleState(), { phase: 'visit', cycle: 0, index: 0, leaving: false, sequence: 1 }, 'still there one millisecond before');
        mock.timers.tick(1);
        assert.deepEqual(getCycleState(), { phase: 'visit', cycle: 0, index: 0, leaving: true, sequence: 1 });

        advance(timing.exit);
        assert.deepEqual(getCycleState(), { phase: 'waiting', cycle: 0, next: 1 });
        advance(timing.gap - 1);
        assert.equal(getCycleState().phase, 'waiting', 'nothing before the gap is over');
        mock.timers.tick(1);
        assert.deepEqual(getCycleState(), { phase: 'visit', cycle: 0, index: 1, leaving: false, sequence: 2 });
    });

    it('skips the chase on touch screens: the rope, the gap, then the visits', () => {
        const { phases, storage } = setup({ canChase: false });
        ensureCycleStarted();
        advance(timing.introDelay + ROPE);
        assert.deepEqual(getCycleState(), { phase: 'waiting', cycle: 0, next: 0 });
        assert.equal(saved(storage).step.kind, 'visit');
        advance(timing.gap);
        assert.equal(getCycleState().phase, 'visit');
        assert.ok(!phases().some((phase) => phase.includes('chase')));
    });

    it('moves on by itself when the chase never reports its end', () => {
        setup();
        ensureCycleStarted();
        advance(timing.introDelay + ROPE + timing.gap);
        assert.equal(getCycleState().phase, 'chase');
        advance(timing.chaseTimeout + timing.gap);
        assert.equal(getCycleState().phase, 'visit');
    });

    it('ignores finishChase outside the chase, and hides a tapped lantern at once', () => {
        setup({ canChase: false });
        ensureCycleStarted();
        finishChase();
        assert.deepEqual(getCycleState(), { phase: 'waiting', cycle: 0, next: 'rope' });

        advance(timing.introDelay + ROPE + timing.gap + 1000);
        skipVisit();
        assert.deepEqual(getCycleState(), { phase: 'visit', cycle: 0, index: 0, leaving: true, sequence: 1 });
        advance(timing.exit + timing.gap);
        assert.deepEqual(getCycleState(), { phase: 'visit', cycle: 0, index: 1, leaving: false, sequence: 2 });
    });

    it('brings back the visit that was on screen after a short delay when the page is opened again, without the rope', () => {
        const storage = memoryStorage();
        storage.setItem(MASCOT_SESSION.key, JSON.stringify({ createdAt: Date.now() - 3600_000, expiresAt: Date.now() + DAY - 3600_000, cycle: 4, step: { kind: 'visit', index: 2 } }));
        const { phases } = setup({ storage });
        ensureCycleStarted();

        assert.deepEqual(getCycleState(), { phase: 'waiting', cycle: 4, next: 2 });
        advance(timing.resumeDelay - 1);
        assert.equal(getCycleState().phase, 'waiting');
        mock.timers.tick(1);
        assert.deepEqual(getCycleState(), { phase: 'visit', cycle: 4, index: 2, leaving: false, sequence: 4 * VISITS + 2 + 1 });
        assert.ok(!phases().some((phase) => phase.startsWith('rope')), 'the rope did not flash');

        advance(timing.visible + timing.exit + timing.gap);
        assert.deepEqual(getCycleState(), { phase: 'rope', cycle: 5, leaving: false }, 'that was the last visit: the next cycle follows');
    });

    it('waits only for what is left of a gap when the page is opened again in the middle of it', () => {
        const storage = memoryStorage();
        storage.setItem(MASCOT_SESSION.key, JSON.stringify({ createdAt: Date.now() - 1000, expiresAt: Date.now() + DAY, cycle: 0, step: { kind: 'visit', index: 1, at: Date.now() + 20_000 } }));
        setup({ storage });
        ensureCycleStarted();

        assert.deepEqual(getCycleState(), { phase: 'waiting', cycle: 0, next: 1 });
        advance(20_000 - 1);
        assert.equal(getCycleState().phase, 'waiting', 'the rest of the gap, not a new one');
        mock.timers.tick(1);
        assert.deepEqual(getCycleState(), { phase: 'visit', cycle: 0, index: 1, leaving: false, sequence: 2 });
    });

    it('waits for the chase, not the rope again, when the page is opened during the gap after the rope', () => {
        const storage = memoryStorage();
        storage.setItem(MASCOT_SESSION.key, JSON.stringify({ createdAt: Date.now() - 1000, expiresAt: Date.now() + DAY, cycle: 0, step: { kind: 'chase', at: Date.now() + 45_000 } }));
        const { phases } = setup({ storage });
        ensureCycleStarted();

        advance(45_000);
        assert.deepEqual(getCycleState(), { phase: 'chase', cycle: 0 });
        assert.ok(!phases().some((phase) => phase.startsWith('rope')));
    });

    it('shows a step whose time has already come after the short resume delay', () => {
        const storage = memoryStorage();
        storage.setItem(MASCOT_SESSION.key, JSON.stringify({ createdAt: Date.now() - 600_000, expiresAt: Date.now() + DAY, cycle: 0, step: { kind: 'visit', index: 2, at: Date.now() - 300_000 } }));
        setup({ storage });
        ensureCycleStarted();

        advance(timing.resumeDelay);
        assert.deepEqual(getCycleState(), { phase: 'visit', cycle: 0, index: 2, leaving: false, sequence: 3 });
    });

    it('takes a saved visit number beyond the visits of this page in turn', () => {
        const storage = memoryStorage();
        storage.setItem(MASCOT_SESSION.key, JSON.stringify({ createdAt: Date.now(), expiresAt: Date.now() + DAY, cycle: 0, step: { kind: 'visit', index: 7 } }));
        setup({ storage });
        ensureCycleStarted();
        advance(timing.resumeDelay);
        assert.equal((getCycleState() as { index: number }).index, 7 % VISITS);
    });

    it('goes back to the chase when the page is opened again during it, and to the first visit on a touch screen', () => {
        const storage = memoryStorage();
        storage.setItem(MASCOT_SESSION.key, JSON.stringify({ createdAt: Date.now(), expiresAt: Date.now() + DAY, cycle: 1, step: { kind: 'chase' } }));
        setup({ storage });
        ensureCycleStarted();
        advance(timing.resumeDelay);
        assert.deepEqual(getCycleState(), { phase: 'chase', cycle: 1 });

        resetCycle();
        setup({ storage, canChase: false });
        storage.setItem(MASCOT_SESSION.key, JSON.stringify({ createdAt: Date.now(), expiresAt: Date.now() + DAY, cycle: 1, step: { kind: 'chase' } }));
        ensureCycleStarted();
        advance(timing.resumeDelay);
        assert.deepEqual(getCycleState(), { phase: 'visit', cycle: 1, index: 0, leaving: false, sequence: VISITS + 1 });
    });

    it('starts over at the rope with a new session when the saved one is over', () => {
        const storage = memoryStorage();
        storage.setItem(MASCOT_SESSION.key, JSON.stringify({ createdAt: Date.now() - DAY - 1, expiresAt: Date.now() - 1, cycle: 9, step: { kind: 'visit', index: 1 } }));
        setup({ storage });
        ensureCycleStarted();

        assert.deepEqual(getCycleState(), { phase: 'waiting', cycle: 0, next: 'rope' });
        const session = saved(storage);
        assert.equal(session.createdAt, Date.now());
        assert.equal(session.expiresAt, Date.now() + DAY);
        assert.equal(session.cycle, 0);
        advance(timing.introDelay);
        assert.equal(getCycleState().phase, 'rope');
    });

    it('keeps running while the pages come and go', () => {
        const { storage } = setup({ canChase: false });
        const seen: string[] = [];
        const unsubscribe = subscribeCycle((state) => seen.push(state.phase));
        ensureCycleStarted();
        advance(timing.introDelay + ROPE + timing.gap);
        assert.equal(getCycleState().phase, 'visit');

        unsubscribe();
        const before = seen.length;
        ensureCycleStarted();
        advance(timing.visible + timing.exit + timing.gap);
        assert.equal(seen.length, before, 'the left page hears nothing more');
        assert.deepEqual(getCycleState(), { phase: 'visit', cycle: 0, index: 1, leaving: false, sequence: 2 }, 'but the show went on');
        assert.deepEqual(saved(storage).step, { kind: 'visit', index: 1 });

        const later: string[] = [];
        subscribeCycle((state) => later.push(state.phase));
        advance(timing.visible);
        assert.deepEqual(later, ['visit'], 'the new page hears the next change');
    });

    it('opens a new session when the day ended while the page stayed open', () => {
        const { storage } = setup({ canChase: false, sessionDuration: 10_000 });
        ensureCycleStarted();
        const first = saved(storage);

        advance(timing.introDelay + ROPE + timing.gap + VISITS * (timing.visible + timing.exit + timing.gap));
        assert.deepEqual(getCycleState(), { phase: 'rope', cycle: 0, leaving: false }, 'back at the rope with the cycles counted from zero');
        const second = saved(storage);
        assert.ok(second.createdAt > first.createdAt);
        assert.equal(second.cycle, 0);
    });
});
