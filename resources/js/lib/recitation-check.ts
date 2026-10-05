import { comparable } from '@/lib/arabic';

/**
 * Compares what a reader recited (the text returned by speech recognition) with the ayahs.
 *
 * Speech recognition writes plain Arabic without diacritics, so the comparison is made on the
 * plain text of the ayahs, word by word and letter by letter. Mistakes in the vowels (a fatha
 * read as a kasra) or in tajweed cannot be heard this way.
 */

export type WordStatus = 'correct' | 'close' | 'wrong' | 'missing' | 'pending';

export type LetterKind = 'ok' | 'wrong' | 'extra' | 'missing';

export interface LetterMark {
    letter: string;
    kind: LetterKind;
}

export interface ExpectedWord {
    ayahId: number;
    /** Position of the word in the ayah text shown (split on spaces). */
    index: number;
    /** The word of the plain text, compared with what was heard. */
    plain: string;
}

export interface CheckedWord extends ExpectedWord {
    status: WordStatus;
    /** What was heard in its place. */
    heard: string | null;
    similarity: number;
}

export interface HeardWord {
    text: string;
    /** extra = said but not in the ayah. */
    status: 'correct' | 'close' | 'wrong' | 'extra';
    letters: LetterMark[];
}

export interface RecitationCheck {
    words: CheckedWord[];
    heard: HeardWord[];
    /** 0 to 100, over the words reached. */
    score: number;
    /** Number of expected words reached (not pending). */
    reached: number;
}

export interface CheckOptions {
    /** The reader may start anywhere (a page); otherwise from the first word. */
    freeStart?: boolean;
    /** The reader has not finished: the words after the last one heard are pending, not missing. */
    partial?: boolean;
}

const CLOSE = 0.75;
const SIMILAR = 0.4;

/**
 * Which plain words (by index) make each word of the mushaf text. They differ where the plain text
 * writes two words for one (يا أيها / يَٰٓأَيُّهَا, يا ابن أم / يَبْنَؤُمَّ).
 */
export function alignTokens(uthmani: string[], simple: string[]): number[][] {
    const groups: number[][] = [];
    let next = 0;

    for (let i = 0; i < uthmani.length; i++) {
        const group: number[] = next < simple.length ? [next++] : [];
        const target = comparable(uthmani[i]);
        const following = i + 1 < uthmani.length ? comparable(uthmani[i + 1]) : '';

        while (next < simple.length && simple.length - next > uthmani.length - i - 1) {
            const joined = comparable(group.map((index) => simple[index]).join(''));

            if (joined.length >= target.length - 1 && comparable(simple[next])[0] === following[0]) {
                break;
            }

            group.push(next++);
        }

        groups.push(group);
    }

    while (next < simple.length && groups.length > 0) {
        groups[groups.length - 1].push(next++);
    }

    return groups;
}

/**
 * The words to recite, from the plain text of the ayahs (or their text when it is missing).
 */
export function expectedWords(ayahs: { id: number; text: string; simple: string | null }[]): ExpectedWord[] {
    return ayahs.flatMap((ayah) => {
        const uthmani = ayah.text.split(' ');
        const simple = (ayah.simple ?? ayah.text).split(' ');
        const groups = alignTokens(uthmani, simple);

        return groups.flatMap((group, index) =>
            group
                .map((position) => comparable(simple[position]))
                .filter((plain) => plain !== '')
                .map((plain) => ({ ayahId: ayah.id, index, plain })),
        );
    });
}

/**
 * Words of the recognized text, in the comparable form.
 */
export function heardWords(transcript: string): string[] {
    return transcript
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => comparable(word) !== '');
}

function levenshtein(a: string, b: string): number {
    const previous = Array.from({ length: b.length + 1 }, (_, index) => index);

    for (let i = 1; i <= a.length; i++) {
        let diagonal = previous[0];
        previous[0] = i;

        for (let j = 1; j <= b.length; j++) {
            const above = previous[j];
            previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
            diagonal = above;
        }
    }

    return previous[b.length];
}

export function similarity(expected: string, heard: string): number {
    if (expected === heard) {
        return 1;
    }

    return 1 - levenshtein(expected, heard) / Math.max(expected.length, heard.length, 1);
}

/**
 * The letters of a heard word marked against the expected word; letters left out are added as missing.
 */
export function letterMarks(expected: string | null, heard: string): LetterMark[] {
    const letters = [...heard];

    if (expected === null) {
        return letters.map((letter) => ({ letter, kind: comparable(letter) === '' ? 'ok' : 'extra' }));
    }

    // Compare the comparable forms, then put the marks back on the letters as heard.
    const units = letters.map((letter) => comparable(letter));
    const actual = [...units.join('')];
    const wanted = [...expected];
    const table: number[][] = Array.from({ length: wanted.length + 1 }, (_, i) =>
        Array.from({ length: actual.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
    );

    for (let i = 1; i <= wanted.length; i++) {
        for (let j = 1; j <= actual.length; j++) {
            table[i][j] = Math.min(table[i - 1][j] + 1, table[i][j - 1] + 1, table[i - 1][j - 1] + (wanted[i - 1] === actual[j - 1] ? 0 : 1));
        }
    }

    // Walk back: the kind of every heard letter, and the expected letters missing before it.
    const kinds: LetterKind[] = new Array(actual.length).fill('ok');
    const missingBefore: string[][] = Array.from({ length: actual.length + 1 }, () => []);
    let i = wanted.length;
    let j = actual.length;

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && table[i][j] === table[i - 1][j - 1] + (wanted[i - 1] === actual[j - 1] ? 0 : 1)) {
            kinds[j - 1] = wanted[i - 1] === actual[j - 1] ? 'ok' : 'wrong';
            i--;
            j--;
        } else if (j > 0 && table[i][j] === table[i][j - 1] + 1) {
            kinds[j - 1] = 'extra';
            j--;
        } else {
            missingBefore[j].unshift(wanted[i - 1]);
            i--;
        }
    }

    const marks: LetterMark[] = [];
    let unit = 0;

    letters.forEach((letter, index) => {
        if (units[index] === '') {
            marks.push({ letter, kind: 'ok' });

            return;
        }

        missingBefore[unit].forEach((missing) => marks.push({ letter: missing, kind: 'missing' }));
        marks.push({ letter, kind: kinds[unit] });
        unit++;
    });

    missingBefore[actual.length]?.forEach((missing) => marks.push({ letter: missing, kind: 'missing' }));

    return marks;
}

function statusOf(similar: number): 'correct' | 'close' | 'wrong' {
    return similar >= 1 ? 'correct' : similar >= CLOSE ? 'close' : 'wrong';
}

/**
 * Align the heard words with the expected ones (fewest mistakes) and grade every word.
 */
export function checkRecitation(expected: ExpectedWord[], transcript: string, options: CheckOptions = {}): RecitationCheck {
    const heard = heardWords(transcript);
    const heardPlain = heard.map((word) => comparable(word));
    const rows = expected.length;
    const columns = heard.length;
    const cost: number[][] = Array.from({ length: rows + 1 }, () => new Array<number>(columns + 1).fill(0));
    const similar: number[][] = Array.from({ length: rows }, (_, i) => heardPlain.map((word) => similarity(expected[i].plain, word)));

    for (let i = 0; i <= rows; i++) {
        for (let j = 0; j <= columns; j++) {
            if (i === 0 && j === 0) {
                continue;
            }

            let best = Infinity;

            if (i === 0) {
                best = j;
            } else if (j === 0) {
                best = options.freeStart ? 0 : i;
            } else {
                const match = similar[i - 1][j - 1];
                const substitute = match >= SIMILAR ? (1 - match) * 1.6 : Infinity;
                best = Math.min(cost[i - 1][j - 1] + substitute, cost[i - 1][j] + 1, cost[i][j - 1] + 1);
            }

            cost[i][j] = best;
        }
    }

    // Where the recitation ends: the last word for a finished recitation, or the best place so far.
    let end = rows;

    if (options.partial) {
        for (let i = 0; i <= rows; i++) {
            if (cost[i][columns] <= cost[end][columns] && (cost[i][columns] < cost[end][columns] || i > end)) {
                end = i;
            }
        }

        if (columns === 0) {
            end = 0;
        }
    }

    const words: CheckedWord[] = expected.map((word) => ({ ...word, status: 'pending', heard: null, similarity: 0 }));
    const marks: HeardWord[] = heard.map((text) => ({ text, status: 'extra', letters: letterMarks(null, text) }));
    let i = end;
    let j = columns;
    let start = end;

    while (i > 0 && j >= 0) {
        if (j === 0) {
            if (options.freeStart) {
                break;
            }

            words[i - 1].status = 'missing';
            start = --i;
            continue;
        }

        const match = similar[i - 1][j - 1];
        const substitute = match >= SIMILAR ? (1 - match) * 1.6 : Infinity;

        if (cost[i][j] === cost[i - 1][j - 1] + substitute) {
            const status = statusOf(match);
            words[i - 1] = { ...words[i - 1], status, heard: heard[j - 1], similarity: match };
            marks[j - 1] = { text: heard[j - 1], status, letters: letterMarks(expected[i - 1].plain, heard[j - 1]) };
            start = --i;
            j--;
        } else if (cost[i][j] === cost[i - 1][j] + 1) {
            words[i - 1].status = 'missing';
            start = --i;
        } else {
            j--;
        }
    }

    // Words skipped before the first one heard were not part of this recitation.
    const first = options.freeStart ? words.findIndex((word, index) => index >= start && word.status !== 'missing') : 0;
    const from = options.freeStart ? (first === -1 ? end : first) : 0;

    for (let index = 0; index < from; index++) {
        words[index].status = 'pending';
    }

    const reached = words.slice(from, end);
    const extras = marks.filter((mark) => mark.status === 'extra').length;
    // A word read right counts fully, one letter off counts in part, a wrong or missing word not at all.
    const credit = reached.reduce((total, word) => total + (word.status === 'correct' ? 1 : word.status === 'close' ? word.similarity : 0), 0);
    const score = reached.length === 0 ? 0 : Math.round((100 * credit) / (reached.length + extras * 0.5));

    return { words, heard: marks, score, reached: reached.length };
}

/**
 * The worst status of the plain words that make one word of the mushaf text.
 */
export function statusByWord(words: CheckedWord[]): Map<number, Map<number, WordStatus>> {
    const order: WordStatus[] = ['pending', 'correct', 'close', 'wrong', 'missing'];
    const result = new Map<number, Map<number, WordStatus>>();

    for (const word of words) {
        const ayah = result.get(word.ayahId) ?? new Map<number, WordStatus>();
        const current = ayah.get(word.index);

        if (current === undefined || order.indexOf(word.status) > order.indexOf(current)) {
            ayah.set(word.index, word.status);
        }

        result.set(word.ayahId, ayah);
    }

    return result;
}
