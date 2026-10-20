import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { CHASE_ACTOR, type ChaseFrame, type ChaseHost, createChase } from '@/lib/mascot/chase';
import { CHASE_TIMING } from '@/lib/mascot/config';

const timing = CHASE_TIMING;
const ENTRY = { x: 24, y: 800 - CHASE_ACTOR.height - 24 };

function advance(ms: number): void {
    const step = 16;

    for (let elapsed = 0; elapsed < ms; elapsed += step) {
        mock.timers.tick(Math.min(step, ms - elapsed));
    }
}

/**
 * A page made of fake timers: frames every 16 ms, and every call of the chase written down.
 */
function makeHost() {
    const calls: unknown[][] = [];
    let frame: ChaseFrame | null = null;
    let frames = 0;

    const host: ChaseHost = {
        now: () => Date.now(),
        requestFrame: (callback) => setTimeout(callback, 16) as unknown as number,
        cancelFrame: (id) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
        viewport: () => ({ width: 1200, height: 800 }),
        entry: () => ({ ...ENTRY }),
        onPhase: (phase) => calls.push(['phase', phase]),
        onMouth: (open) => calls.push(['mouth', open]),
        onFrame: (next) => {
            frame = next;
            frames++;
        },
        onCursorHidden: (hidden) => calls.push(['cursor', hidden]),
        onEat: (cursor, mouth) => calls.push(['eat', cursor, mouth]),
        onChomp: () => calls.push(['chomp']),
        onPit: (open) => calls.push(['pit', open]),
        onFall: () => calls.push(['fall']),
        onDone: () => calls.push(['done']),
    };

    return {
        host,
        calls,
        of: (name: string) => calls.filter((call) => call[0] === name),
        frame: () => frame as ChaseFrame | null,
        frames: () => frames,
        mouth: () => ({ x: (frame?.x ?? 0) + CHASE_ACTOR.width * CHASE_ACTOR.mouthX, y: (frame?.y ?? 0) + CHASE_ACTOR.height * CHASE_ACTOR.mouthY }),
    };
}

function startRunning() {
    const page = makeHost();
    const chase = createChase(page.host);
    chase.start();
    advance(timing.enter);

    return { ...page, chase };
}

describe('the chase', () => {
    beforeEach(() => {
        mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1_000_000 });
    });

    afterEach(() => {
        mock.timers.reset();
    });

    it('pops up from its corner at once, then starts running after the pop', () => {
        const page = makeHost();
        const chase = createChase(page.host);
        assert.equal(chase.phase(), 'hidden');

        chase.start();
        assert.equal(chase.phase(), 'pop');
        assert.deepEqual(page.frame(), { ...ENTRY, tilt: 0, hop: 0, stretch: 0 });
        advance(timing.enter);
        assert.equal(chase.phase(), 'chase');
        advance(200);
        assert.ok(page.frames() > 5, 'frames keep coming');
    });

    it('runs after the pointer at the set speed, leaning and hopping that way', () => {
        const page = startRunning();
        const start = page.mouth();
        page.chase.pointerMoved(start.x + 2000, start.y);

        advance(1000);
        const run = page.mouth().x - start.x;
        assert.ok(Math.abs(run - timing.speed) < timing.speed * 0.1, `ran ${run.toFixed(0)}px in a second, expected about ${timing.speed}`);
        assert.ok((page.frame()?.tilt ?? 0) > 0, 'leans to the right where it runs');
        assert.equal(page.of('mouth').length, 0, 'the pointer stayed far: the grin stayed');

        page.chase.pointerMoved(0, start.y);
        advance(100);
        assert.ok((page.frame()?.tilt ?? 0) < 0, 'leans to the left when it turns around');
        assert.equal(page.of('eat').length, 0);
    });

    it('opens its jaws when the pointer comes close and closes them when it goes away, once each', () => {
        const page = startRunning();
        const mouth = page.mouth();
        page.chase.pointerMoved(mouth.x + 100, mouth.y);
        advance(16);
        assert.deepEqual(page.of('mouth'), [['mouth', true]]);

        advance(64);
        assert.deepEqual(page.of('mouth'), [['mouth', true]], 'still open, said once');

        page.chase.pointerMoved(mouth.x + 600, mouth.y);
        advance(32);
        assert.deepEqual(page.of('mouth'), [['mouth', true], ['mouth', false]]);
        assert.equal(page.of('eat').length, 0);
    });

    it('eats the pointer, falls into the pit and says it is done, once', () => {
        const page = startRunning();
        const mouth = page.mouth();
        page.chase.pointerMoved(mouth.x + 10, mouth.y + 5);
        advance(16);

        assert.equal(page.chase.phase(), 'eat');
        assert.deepEqual(page.of('cursor'), [['cursor', true]], 'the real pointer hides');
        const eat = page.of('eat')[0];
        assert.deepEqual(eat[1], { x: mouth.x + 10, y: mouth.y + 5 });
        assert.deepEqual(page.of('mouth'), [['mouth', true]], 'the jaws open for the meal');

        advance(timing.chompAt);
        assert.equal(page.of('chomp').length, 1);
        advance(2 * timing.chompGap + 16);
        assert.deepEqual(
            page.of('mouth').map((call) => call[1]),
            [true, false, true, false],
            'the jaws snap shut twice',
        );

        advance(timing.eatDuration - timing.chompAt - 2 * timing.chompGap);
        assert.deepEqual(page.of('cursor'), [['cursor', true], ['cursor', false]], 'the real pointer is back');
        assert.equal(page.chase.phase(), 'fall');
        assert.deepEqual(page.of('pit'), [['pit', true]]);

        advance(timing.pitOpen);
        assert.equal(page.of('fall').length, 1);
        advance(timing.fall);
        assert.deepEqual(page.of('pit'), [['pit', true], ['pit', false]]);
        assert.equal(page.of('done').length, 0, 'not before the pit has closed');
        advance(timing.pitClose);
        assert.equal(page.of('done').length, 1);
        assert.equal(page.chase.phase(), 'done');

        advance(5000);
        assert.equal(page.of('done').length, 1, 'said once');
    });

    it('gives up and falls when the pointer stays still, without eating anything', () => {
        const page = startRunning();
        page.chase.pointerMoved(5000, 400);

        advance(timing.idleTimeout - 100);
        assert.equal(page.chase.phase(), 'chase');
        advance(200);
        assert.equal(page.chase.phase(), 'fall');
        assert.equal(page.of('eat').length, 0);
        assert.equal(page.of('cursor').length, 0, 'the real pointer was never hidden');
        assert.ok(page.frame()!.x <= 1200 - CHASE_ACTOR.width, 'it stayed inside the window');

        advance(timing.pitOpen + timing.fall + timing.pitClose);
        assert.equal(page.of('done').length, 1);
    });

    it('gives up after the longest chase even when the pointer keeps moving away', () => {
        const page = startRunning();

        for (let elapsed = 0; elapsed < timing.maxDuration; elapsed += 500) {
            page.chase.pointerMoved(elapsed % 1000 === 0 ? -5000 : 5000, 400);
            advance(500);
        }

        advance(16);
        assert.equal(page.chase.phase(), 'fall');
        assert.equal(page.of('eat').length, 0);
    });

    it('brings the real pointer back when the page is left in the middle of its meal', () => {
        const page = startRunning();
        const mouth = page.mouth();
        page.chase.pointerMoved(mouth.x, mouth.y);
        advance(16);
        assert.deepEqual(page.of('cursor'), [['cursor', true]]);

        advance(100);
        page.chase.stop();
        assert.deepEqual(page.of('cursor'), [['cursor', true], ['cursor', false]]);

        advance(10000);
        assert.equal(page.of('done').length, 0, 'nothing happens after stop()');
        assert.equal(page.of('pit').length, 0);
    });
});
