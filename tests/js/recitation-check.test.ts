import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { expectedWords, followRecitation, wordsSaidRight } from '@/lib/recitation-check';

const fatiha = expectedWords([
    { id: 2, text: 'الحمد لله رب العالمين', simple: 'الحمد لله رب العالمين' },
    { id: 3, text: 'الرحمن الرحيم', simple: 'الرحمن الرحيم' },
    { id: 4, text: 'مالك يوم الدين', simple: 'مالك يوم الدين' },
]);

const mistakesOf = (progress: ReturnType<typeof followRecitation>) => progress.mistakes.map((mistake) => `${mistake.written}:${mistake.kind}`);

describe('a recitation read straight through (continuous)', () => {
    it('keeps a word read with wrong letters and goes on to the end', () => {
        const progress = followRecitation(fatiha, 'الحمد لله رب العالمين الرحمن الرحين مالك يوم الدين', '', { continuous: true });

        assert.deepEqual(mistakesOf(progress), ['الرحيم:letter']);
        assert.equal(progress.blocked, null);
        assert.equal(progress.finished, true);
        assert.equal(progress.right, 8);
    });

    it('keeps the words left out and goes on from the word said', () => {
        const progress = followRecitation(fatiha, 'الحمد لله رب العالمين الرحيم مالك يوم الدين', '', { continuous: true });

        assert.deepEqual(mistakesOf(progress), ['الرحمن:skipped']);
        assert.equal(progress.finished, true);
    });

    it('finds the reader again further on when a whole ayah was not heard, instead of counting every next word wrong', () => {
        const longer = expectedWords([
            { id: 2, text: 'الحمد لله رب العالمين', simple: 'الحمد لله رب العالمين' },
            { id: 3, text: 'الرحمن الرحيم', simple: 'الرحمن الرحيم' },
            { id: 4, text: 'مالك يوم الدين', simple: 'مالك يوم الدين' },
            { id: 5, text: 'إياك نعبد وإياك نستعين', simple: 'إياك نعبد وإياك نستعين' },
        ]);
        const progress = followRecitation(longer, 'الحمد لله رب العالمين إياك نعبد وإياك نستعين', '', { continuous: true });

        assert.deepEqual(mistakesOf(progress), ['الرحمن:skipped', 'الرحيم:skipped', 'مالك:skipped', 'يوم:skipped', 'الدين:skipped']);
        assert.equal(progress.heard.filter((word) => word.status === 'right').length, 8);
        assert.equal(progress.finished, true);
    });

    it('counts another word said instead as a mistake and goes on', () => {
        const progress = followRecitation(fatiha, 'الحمد لله رب الناس الرحمن الرحيم مالك يوم الدين', '', { continuous: true });

        assert.deepEqual(mistakesOf(progress), ['العالمين:word']);
        assert.equal(progress.finished, true);
    });

    it('does not count a word too many when the right word comes right after it', () => {
        const progress = followRecitation(fatiha, 'الحمد لله رب كتاب العالمين الرحمن الرحيم مالك يوم الدين', '', { continuous: true });

        assert.deepEqual(mistakesOf(progress), []);
        assert.equal(progress.heard[3].status, 'wrong');
        assert.equal(progress.finished, true);
    });

    it('marks the mistakes of the first passages while the next ones are still being heard', () => {
        const progress = followRecitation(fatiha, 'الحمد لله رب العالمين الرحمن الرحين', 'مالك يوم', { continuous: true });

        assert.deepEqual(mistakesOf(progress), ['الرحيم:letter']);
        assert.equal(progress.cursor, 6);
        assert.equal(progress.reached, 8);
    });
});

describe('going back over the words (continuous)', () => {
    const kindsOf = (progress: ReturnType<typeof followRecitation>) => [...progress.kinds.entries()];

    it('corrects a word said right again right after its mistake', () => {
        const progress = followRecitation(fatiha, 'الحمد لله رب العالمين الرحمن الرحين الرحيم مالك يوم الدين', '', { continuous: true });

        assert.deepEqual(kindsOf(progress), []);
        assert.equal(progress.score, 100);
        assert.equal(progress.finished, true);
        assert.ok(wordsSaidRight(fatiha, progress).has('3:1'));
    });

    it('corrects a word when the ayah is read again right', () => {
        const progress = followRecitation(fatiha, 'الحمد لله رب العالمين الرحمن الرحين الرحمن الرحيم مالك يوم الدين', '', { continuous: true });

        assert.deepEqual(kindsOf(progress), []);
        assert.equal(progress.finished, true);
    });

    it('keeps the last try when the word is read wrong again', () => {
        const progress = followRecitation(fatiha, 'الحمد لله رب العالمين الرحمن الرحين الرحمن الرحيل مالك يوم الدين', '', { continuous: true });

        assert.deepEqual(kindsOf(progress), [[5, 'letter']]);
        assert.equal(progress.mistakes.at(-1)?.heard, 'الرحيل');
        assert.ok(!wordsSaidRight(fatiha, progress).has('3:1'));
    });

    it('corrects a word when its ayah is read again after going on to the next ones', () => {
        const longer = expectedWords([
            { id: 2, text: 'الحمد لله رب العالمين', simple: 'الحمد لله رب العالمين' },
            { id: 3, text: 'الرحمن الرحيم', simple: 'الرحمن الرحيم' },
            { id: 4, text: 'مالك يوم الدين', simple: 'مالك يوم الدين' },
            { id: 5, text: 'إياك نعبد وإياك نستعين', simple: 'إياك نعبد وإياك نستعين' },
            { id: 6, text: 'اهدنا الصراط المستقيم', simple: 'اهدنا الصراط المستقيم' },
        ]);
        const midway = followRecitation(longer, 'الحمد لله رب العالمين الرحمن الرحين مالك يوم الدين إياك نعبد وإياك نستعين الرحمن الرحيم اهدنا الصراط المستقيم', '', {
            continuous: true,
        });

        assert.deepEqual(kindsOf(midway), []);
        assert.equal(midway.finished, true);

        const atTheEnd = followRecitation(longer, 'الحمد لله رب العالمين الرحمن الرحين مالك يوم الدين إياك نعبد وإياك نستعين اهدنا الصراط المستقيم الرحمن الرحيم', '', {
            continuous: true,
        });

        assert.deepEqual(kindsOf(atTheEnd), []);
        assert.ok(wordsSaidRight(longer, atTheEnd).has('3:1'));
    });

    it('does not judge again a word already said right', () => {
        const progress = followRecitation(fatiha, 'الحمد لله رب العالمين الرحمن الرحيم الرحمن الرحين مالك يوم الدين', '', { continuous: true });

        assert.deepEqual(kindsOf(progress), []);
        assert.equal(progress.mistakes.length, 0);
    });
});

describe('a recitation with a teacher (stops at a mistake)', () => {
    it('stays at the word read wrong until it is said right', () => {
        const progress = followRecitation(fatiha, 'الحمد لله رب العالمين الرحمن الرحين مالك يوم الدين', '');

        assert.deepEqual(mistakesOf(progress), ['الرحيم:letter']);
        assert.equal(progress.blocked?.written, 'الرحيم');
        assert.equal(progress.cursor, 5);
        assert.equal(progress.finished, false);
    });
});
