import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { lookAt, MASCOT_LOOKS, nextLookIndex } from '@/lib/mascot/looks';
import { quoteForVisit, quoteOfTheDay, quotesOfKinds, truncateQuote } from '@/lib/mascot/quotes';
import { sampleQuotes } from './support';

describe('the looks of the companion', () => {
    it('has between 6 and 8 looks that differ, and turns from the last back to the first', () => {
        assert.ok(MASCOT_LOOKS.length >= 6 && MASCOT_LOOKS.length <= 8, `${MASCOT_LOOKS.length} looks`);
        assert.equal(new Set(MASCOT_LOOKS.map((look) => JSON.stringify(look))).size, MASCOT_LOOKS.length, 'no two looks are the same');
        assert.equal(new Set(MASCOT_LOOKS.map((look) => look.halo)).size, 4, 'four halo colors');

        let index = 0;

        for (let step = 0; step < MASCOT_LOOKS.length; step++) {
            index = nextLookIndex(index);
        }

        assert.equal(index, 0);
        assert.deepEqual(lookAt(MASCOT_LOOKS.length + 2), MASCOT_LOOKS[2]);
        assert.deepEqual(lookAt(-1), MASCOT_LOOKS[MASCOT_LOOKS.length - 1]);
    });
});

describe('the texts of the companion', () => {
    it('takes the texts of a kind in turn, and the texts of other kinds when the kind has none', () => {
        const quotes = sampleQuotes();

        assert.equal(quoteForVisit(quotes, 'ayah', 0)?.id, 'ayah:94:6');
        assert.equal(quoteForVisit(quotes, 'ayah', 1)?.id, 'ayah:54:17');
        assert.equal(quoteForVisit(quotes, 'ayah', 2)?.id, 'ayah:94:6');
        assert.equal(quoteForVisit(quotes, 'hadith', 7)?.id, 'hadith:la-taghdab');
        assert.equal(quoteForVisit(quotes.filter((quote) => quote.kind !== 'wisdom'), 'wisdom', 0)?.id, 'ayah:94:6');
        assert.equal(quoteForVisit([], 'ayah', 0), null);
        assert.equal(quotesOfKinds(quotes, ['dhikr']).length, 1);
        assert.equal(quotesOfKinds(quotes, []).length, quotes.length, 'no kind wanted: every text');
    });

    it('gives the same text of the day all day long and another one the next day', () => {
        const quotes = sampleQuotes();
        const morning = quoteOfTheDay(quotes, new Date(2026, 9, 20, 8));
        const night = quoteOfTheDay(quotes, new Date(2026, 9, 20, 23));
        const tomorrow = quoteOfTheDay(quotes, new Date(2026, 9, 21, 8));

        assert.equal(morning?.id, night?.id);
        assert.notEqual(morning?.id, tomorrow?.id);
        assert.equal(quoteOfTheDay([]), null);
    });

    it('cuts a long text at a word with an ellipsis and leaves a short one whole', () => {
        assert.deepEqual(truncateQuote('قيمة كل امرئ ما يُحسن.', 50), { text: 'قيمة كل امرئ ما يُحسن.', truncated: false });

        const cut = truncateQuote('الناس محتاجون إلى العلم أكثر من حاجتهم إلى الطعام والشراب', 30);
        assert.equal(cut.truncated, true);
        assert.ok(cut.text.endsWith('…'));
        assert.ok(cut.text.length <= 31);
        assert.ok(!cut.text.includes('حاجته'), 'no word is cut in two');
    });
});
