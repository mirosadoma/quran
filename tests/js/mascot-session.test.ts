import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MASCOT_SESSION } from '@/lib/mascot/config';
import { createSession, isSessionExpired, readSession, type SessionStorageLike, writeSession } from '@/lib/mascot/session';

export function memoryStorage(): SessionStorageLike & { map: Map<string, string> } {
    const map = new Map<string, string>();

    return {
        map,
        getItem: (key) => map.get(key) ?? null,
        setItem: (key, value) => {
            map.set(key, value);
        },
        removeItem: (key) => {
            map.delete(key);
        },
    };
}

const DAY = 24 * 60 * 60 * 1000;

describe("the companion's day session", () => {
    it('is created for a whole day, standing at the rope, and saved in the browser', () => {
        const storage = memoryStorage();
        const session = createSession(storage, 1_000_000);

        assert.equal(session.createdAt, 1_000_000);
        assert.equal(session.expiresAt - session.createdAt, DAY);
        assert.equal(MASCOT_SESSION.duration, DAY);
        assert.equal(session.cycle, 0);
        assert.deepEqual(session.step, { kind: 'rope' });
        assert.deepEqual(JSON.parse(storage.map.get(MASCOT_SESSION.key) ?? 'null'), session);
    });

    it('reads back what was saved, with the step the show stood at', () => {
        const storage = memoryStorage();
        const session = createSession(storage, 1_000_000);
        session.cycle = 2;
        session.step = { kind: 'visit', index: 3 };
        writeSession(storage, session);

        assert.deepEqual(readSession(storage, 1_000_000 + DAY / 2), { createdAt: 1_000_000, expiresAt: 1_000_000 + DAY, cycle: 2, step: { kind: 'visit', index: 3 } });
    });

    it('keeps when the step it waits for is due', () => {
        const storage = memoryStorage();
        const session = createSession(storage, 1_000_000);
        session.step = { kind: 'chase', at: 1_060_000 };
        writeSession(storage, session);

        assert.deepEqual(readSession(storage, 1_000_500)?.step, { kind: 'chase', at: 1_060_000 });

        storage.setItem(MASCOT_SESSION.key, JSON.stringify({ ...session, step: { kind: 'chase', at: 'soon' } }));
        assert.equal(readSession(storage, 1_000_500), null, 'a due time that is not a number');
    });

    it('is gone once the day is over, and when nothing readable was saved', () => {
        const storage = memoryStorage();
        const session = createSession(storage, 1_000_000);

        assert.equal(isSessionExpired(session, 1_000_000 + DAY - 1), false);
        assert.equal(isSessionExpired(session, 1_000_000 + DAY), true);
        assert.equal(readSession(storage, 1_000_000 + DAY), null, 'expired');

        storage.setItem(MASCOT_SESSION.key, '{"createdAt":1,"step":{"kind":"flying"}}');
        assert.equal(readSession(storage, 2), null, 'broken');

        storage.setItem(MASCOT_SESSION.key, 'not json');
        assert.equal(readSession(storage, 2), null, 'not json');

        storage.removeItem(MASCOT_SESSION.key);
        assert.equal(readSession(storage, 2), null, 'missing');
    });

    it('still gives a session where the browser offers no storage', () => {
        const session = createSession(null, 5);

        assert.deepEqual(session.step, { kind: 'rope' });
        assert.equal(readSession(null, 5), null);
    });
});
