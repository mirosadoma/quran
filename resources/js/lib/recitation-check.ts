import { comparable, letterClusters, letterKey, vowelOf, type Vowel } from '@/lib/arabic';

/**
 * Follows a reader reciting from memory word by word, the way a teacher listens (تسميع):
 *
 * - the next word must be said right before going on: a mistake (a wrong letter or vowel, another word,
 *   a word left out) stops the recitation at that word until the reader says it right;
 * - only the right continuation is written: other speech (the isti'adha, the words said again to take a
 *   run at the next one, what was said before hearing the alert) is ignored;
 * - every mistake is kept with the letters read wrong, to mark them on the mushaf.
 *
 * The speech recognition of the browser writes plain Arabic, so with it only the letters are checked.
 * The recognition on the server writes the diacritics too: then the vowels are checked as well.
 */

export interface ExpectedWord {
    ayahId: number;
    /** Position of the word in the ayah text shown (split on spaces). */
    index: number;
    /** The word of the plain text in its comparable form, compared with what was heard. */
    plain: string;
    /** The word of the plain text as spelled there (أيها). */
    simple: string;
    /** The word as written in the mushaf; several plain words can make one (يَٰٓأَيُّهَا = يا أيها). */
    written: string;
}

export type MistakeKind = 'letter' | 'vowel' | 'word' | 'skipped' | 'helped';

export interface RecitationMistake {
    ayahId: number;
    index: number;
    /** The word as written in the mushaf. */
    written: string;
    kind: MistakeKind;
    /** What the reader said instead (null when the word was prompted). */
    heard: string | null;
    /** Letters of the mushaf word (by position in letterClusters) read wrong, and read with another vowel. */
    letters: number[];
    vowels: number[];
    /** The same in the word heard. */
    heardLetters: number[];
    heardVowels: number[];
}

/**
 * pending = not reached, current = the word to say now, correct = said right the first time,
 * vowel / close / wrong = said right after a vowel mistake / a letter mistake / another word.
 */
export type WordStatus = 'pending' | 'current' | 'correct' | 'vowel' | 'close' | 'wrong';

export interface RecitationProgress {
    /** Position (in the expected words) where the reader started; null while waiting for the start. */
    start: number | null;
    /** The words from start up to this position were said right (the next one is the word to say). */
    cursor: number;
    /** The cursor with the words still being recognized (they may change, so they count only when final). */
    reached: number;
    /** The mistakes of this recitation, in order. */
    mistakes: RecitationMistake[];
    /** The mistake on the word to say now, while the reader has not said it right. */
    blocked: RecitationMistake | null;
    /** The worst mistake made on each word of this recitation, by position. */
    kinds: Map<number, MistakeKind>;
    /** Number of final words heard (to place a prompt in the recitation). */
    said: number;
    finished: boolean;
    /** 0 to 100: over the words reached, or over all the words with the option `whole`. */
    score: number;
    /** Words said right the first time. */
    right: number;
}

export interface FollowOptions {
    /** The reader may start at any word (a page of the mushaf); otherwise at the first word. */
    freeStart?: boolean;
    /** Check the vowels of the words heard with their diacritics. */
    vowels?: boolean;
    /** Words prompted at the reader's request: the number of final words heard when each was asked. */
    prompts?: number[];
    /** Score over all the expected words (the ones not reached count as not said). */
    whole?: boolean;
}

export interface WordMark {
    status: WordStatus;
    /** Said right in this recitation (shown even when the ayahs are hidden). */
    said: boolean;
    /** The reader made a mistake on the word to say now. */
    blocked: boolean;
    /** Letters (by position in letterClusters) read wrong, and read with another vowel, in this session. */
    letters: number[];
    vowels: number[];
    /** What was said instead. */
    heard: string[];
}

/** A word heard this similar to the expected one is a try at it with wrong letters. */
const LETTER_SIMILAR = 0.5;
/** A word of the next ones heard instead of the expected one: the expected word was left out. */
const LOOKAHEAD = 3;
/** How far back the reader may go to say words again. */
const REWIND = 15;
/** Said before reciting (isti'adha and basmala): not mistakes while waiting for the first word. */
const OPENING = new Set(['اعوذ', 'بالله', 'من', 'الشيطان', 'الرجيم', 'بسم', 'الله', 'الرحمن', 'الرحيم'].map(comparable));

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
                .map((position) => ({ ayahId: ayah.id, index, plain: comparable(simple[position]), simple: simple[position], written: uthmani[index] }))
                .filter((word) => word.plain !== ''),
        );
    });
}

/**
 * Words of the recognized text.
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
 * How much a heard word looks like the expected one, without the article both may start with (العالمين
 * and الرحمن are different words).
 */
function likeness(expected: string, heard: string): number {
    return expected.startsWith('ال') && heard.startsWith('ال') ? similarity(expected.slice(2), heard.slice(2)) : similarity(expected, heard);
}

interface Letter {
    key: string;
    vowel: Vowel | null;
    /** Position in letterClusters. */
    position: number;
}

function lettersOf(word: string): Letter[] {
    return letterClusters(word)
        .map((cluster, position) => ({ key: letterKey(cluster), vowel: vowelOf(cluster), position }))
        .filter((letter) => letter.key !== '');
}

/** Long vowel letters: the mushaf and the plain spelling often differ there (صِرَٰطَ / صراط), so a missing one is no mistake. */
const SPELLING = new Set(['ا', 'و', 'ي']);

function sameLetter(a: string, b: string): boolean {
    // A hamza is often written on another seat, or without it, by speech recognition (إسلام / اسلام).
    return a === b || (a === 'ء' && SPELLING.has(b)) || (b === 'ء' && SPELLING.has(a));
}

export interface WordComparison {
    /** Letters of the written word read wrong or left out, and read with another vowel (positions in letterClusters). */
    letters: number[];
    vowels: number[];
    /** The same in the word heard. */
    heardLetters: number[];
    heardVowels: number[];
}

/**
 * Letter by letter comparison of a mushaf word with what was heard: letters changed or left out, and
 * letters said with another vowel (when the heard word has diacritics).
 */
export function compareWord(written: string, heard: string): WordComparison {
    const wanted = lettersOf(written);
    const actual = lettersOf(heard);
    const table: number[][] = Array.from({ length: wanted.length + 1 }, (_, i) =>
        Array.from({ length: actual.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
    );

    for (let i = 1; i <= wanted.length; i++) {
        for (let j = 1; j <= actual.length; j++) {
            const change = sameLetter(wanted[i - 1].key, actual[j - 1].key) ? 0 : 1;
            table[i][j] = Math.min(table[i - 1][j] + 1, table[i][j - 1] + 1, table[i - 1][j - 1] + change);
        }
    }

    const result: WordComparison = { letters: [], vowels: [], heardLetters: [], heardVowels: [] };
    let i = wanted.length;
    let j = actual.length;

    while (i > 0 || j > 0) {
        const same = i > 0 && j > 0 && sameLetter(wanted[i - 1].key, actual[j - 1].key);

        if (i > 0 && j > 0 && table[i][j] === table[i - 1][j - 1] + (same ? 0 : 1)) {
            const expected = wanted[i - 1];
            const said = actual[j - 1];

            if (!same) {
                result.letters.push(expected.position);
                result.heardLetters.push(said.position);
            } else if (expected.vowel !== null && said.vowel !== null && expected.vowel !== said.vowel) {
                result.vowels.push(expected.position);
                result.heardVowels.push(said.position);
            }

            i--;
            j--;
        } else if (i > 0 && table[i][j] === table[i - 1][j] + 1) {
            if (!SPELLING.has(wanted[i - 1].key)) {
                result.letters.push(wanted[i - 1].position);
            }

            i--;
        } else {
            if (!SPELLING.has(actual[j - 1].key)) {
                result.heardLetters.push(actual[j - 1].position);
            }

            j--;
        }
    }

    const order = (values: number[]) => values.sort((a, b) => a - b);

    return { letters: order(result.letters), vowels: order(result.vowels), heardLetters: order(result.heardLetters), heardVowels: order(result.heardVowels) };
}

function sameWord(a: ExpectedWord, b: ExpectedWord): boolean {
    return a.ayahId === b.ayahId && a.index === b.index;
}

/**
 * Compare what was heard for one plain word with its mushaf word, which may be made of several plain
 * words: the other plain words are taken as written, and the marks in the heard text are put back on
 * the heard word.
 */
function compareAt(expected: ExpectedWord[], position: number, heard: string): WordComparison {
    let first = position;
    let last = position;

    while (first > 0 && sameWord(expected[first - 1], expected[position])) {
        first--;
    }

    while (last + 1 < expected.length && sameWord(expected[last + 1], expected[position])) {
        last++;
    }

    const before = expected
        .slice(first, position)
        .map((word) => word.simple)
        .join('');
    const after = expected
        .slice(position + 1, last + 1)
        .map((word) => word.simple)
        .join('');
    const written = expected[position].written;
    const comparison = compareWord(written, before + heard + after);
    const offset = letterClusters(before).length;
    const length = letterClusters(heard).length;
    const inHeard = (values: number[]) => values.filter((value) => value >= offset && value < offset + length).map((value) => value - offset);

    // At the end of an ayah the reader may stop (waqf): the last letter is then read with a sukun.
    if (last + 1 >= expected.length || expected[last + 1].ayahId !== expected[position].ayahId) {
        const clusters = letterClusters(written);
        const final = clusters.findLastIndex((cluster) => letterKey(cluster) !== '');
        const kept = comparison.vowels.filter((value) => value !== final);

        if (kept.length < comparison.vowels.length) {
            const heardFinal = letterClusters(before + heard + after).findLastIndex((cluster) => letterKey(cluster) !== '');

            return { ...comparison, vowels: kept, heardLetters: inHeard(comparison.heardLetters), heardVowels: inHeard(comparison.heardVowels.filter((value) => value !== heardFinal)) };
        }
    }

    return { ...comparison, heardLetters: inHeard(comparison.heardLetters), heardVowels: inHeard(comparison.heardVowels) };
}

function mistakeAt(expected: ExpectedWord[], position: number, kind: MistakeKind, heard: string | null): RecitationMistake {
    const word = expected[position];
    const comparison = heard !== null && (kind === 'letter' || kind === 'vowel') ? compareAt(expected, position, heard) : null;

    return {
        ayahId: word.ayahId,
        index: word.index,
        written: word.written,
        kind,
        heard,
        letters: kind === 'letter' ? (comparison?.letters ?? []) : [],
        vowels: comparison?.vowels ?? [],
        heardLetters: kind === 'letter' ? (comparison?.heardLetters ?? []) : [],
        heardVowels: comparison?.heardVowels ?? [],
    };
}

const SEVERITY: MistakeKind[] = ['vowel', 'letter', 'helped', 'skipped', 'word'];

function worse(a: MistakeKind | undefined, b: MistakeKind): MistakeKind {
    return a === undefined || SEVERITY.indexOf(b) > SEVERITY.indexOf(a) ? b : a;
}

type Step =
    | { type: 'accept'; words: number; heard: number }
    | { type: 'mistake'; kind: MistakeKind }
    | { type: 'again'; at: number }
    | { type: 'ignore' };

interface Context {
    expected: ExpectedWord[];
    start: number;
    cursor: number;
    /** The last word said again while the reader goes back, or null. */
    again: number | null;
    blocked: boolean;
    vowels: boolean;
}

/**
 * Whether a heard word (with the next one) is the expected word at a position: one word, two words
 * the recognition joined, or one word it split.
 */
function matchAt(expected: ExpectedWord[], position: number, word: string, next: string | null): { words: number; heard: number } | null {
    const target = expected[position]?.plain;

    if (target === undefined) {
        return null;
    }

    if (word === target) {
        return { words: 1, heard: 1 };
    }

    if (position + 1 < expected.length && word === target + expected[position + 1].plain) {
        return { words: 2, heard: 1 };
    }

    if (next !== null && word + next === target) {
        return { words: 1, heard: 2 };
    }

    return null;
}

function judge(context: Context, heard: string[], at: number): Step {
    const { expected, start, cursor } = context;
    const word = comparable(heard[at]);
    const next = at + 1 < heard.length ? comparable(heard[at + 1]) : null;

    // Going on with the words said again.
    if (context.again !== null && context.again + 1 < cursor && expected[context.again + 1].plain === word) {
        return { type: 'again', at: context.again + 1 };
    }

    const match = matchAt(expected, cursor, word, next);

    if (match) {
        if (match.words === 1 && match.heard === 1 && context.vowels && compareAt(expected, cursor, heard[at]).vowels.length > 0) {
            return { type: 'mistake', kind: 'vowel' };
        }

        return { type: 'accept', ...match };
    }

    // Going back to say earlier words again (to take a run at the next one).
    for (let position = cursor - 1; position >= Math.max(start, cursor - REWIND); position--) {
        if (expected[position].plain === word) {
            return { type: 'again', at: position };
        }
    }

    const similar = likeness(expected[cursor].plain, word);

    // After a mistake only another try at the same word counts: the rest is what the reader said
    // before hearing the alert, or anything else.
    if (context.blocked) {
        return similar >= LETTER_SIMILAR ? { type: 'mistake', kind: 'letter' } : { type: 'ignore' };
    }

    if (similar >= LETTER_SIMILAR) {
        return { type: 'mistake', kind: 'letter' };
    }

    if (expected.slice(cursor + 1, cursor + 1 + LOOKAHEAD).some((later) => later.plain === word)) {
        return { type: 'mistake', kind: 'skipped' };
    }

    return { type: 'mistake', kind: 'word' };
}

/**
 * How many words heard from `at` follow the expected words from `position`.
 */
function runAt(expected: ExpectedWord[], position: number, heard: string[], at: number): number {
    let run = 0;

    while (position + run < expected.length && at + run < heard.length && expected[position + run].plain === comparable(heard[at + run])) {
        run++;
    }

    return run;
}

/**
 * Where the reader starts, from the word heard at `at`: the first word (or a try at it), or, when
 * the reader may start anywhere, two words in a row of the ayahs.
 */
function startAt(expected: ExpectedWord[], heard: string[], at: number, freeStart: boolean): number | null {
    const word = comparable(heard[at]);
    const next = at + 1 < heard.length ? comparable(heard[at + 1]) : null;
    const first = matchAt(expected, 0, word, next);
    // The first word; when it is also a word of the basmala, the next word must follow it (بسم الله الرحمن /
    // الله لا إله إلا هو).
    const isFirst = !!first && (!OPENING.has(word) || next === null || first.heard === 2 || expected.length <= first.words || matchAt(expected, first.words, next, null) !== null);

    if (freeStart) {
        // Elsewhere: the place where most of the words heard follow each other (at least two), as a word
        // can appear several times on a page.
        let best: number | null = isFirst ? 0 : null;
        let longest = isFirst ? Math.max(1, runAt(expected, 0, heard, at)) : 1;

        for (let position = 1; position < expected.length; position++) {
            const run = expected[position].plain === word ? runAt(expected, position, heard, at) : 0;

            if (run > longest) {
                best = position;
                longest = run;
            }
        }

        return best;
    }

    if (isFirst) {
        return 0;
    }

    if (OPENING.has(word)) {
        return null;
    }

    // A try at the first word with wrong letters, or a word after it (the first one left out).
    if (likeness(expected[0].plain, word) >= LETTER_SIMILAR || expected.slice(1, 1 + LOOKAHEAD).some((later) => later.plain === word)) {
        return 0;
    }

    return null;
}

/**
 * Where the reader is in the expected words, from the final words heard and the words still being
 * recognized (interim).
 */
export function followRecitation(expected: ExpectedWord[], final: string, interim: string, options: FollowOptions = {}): RecitationProgress {
    const heard = heardWords(final);
    const prompts = options.prompts ?? [];
    const kinds = new Map<number, MistakeKind>();
    const mistakes: RecitationMistake[] = [];
    let start: number | null = null;
    let cursor = 0;
    let again: number | null = null;
    let blocked: RecitationMistake | null = null;
    let prompt = 0;

    const fail = (position: number, kind: MistakeKind, word: string | null): RecitationMistake => {
        const mistake = mistakeAt(expected, position, kind, word);
        mistakes.push(mistake);
        kinds.set(position, worse(kinds.get(position), kind));

        return mistake;
    };

    for (let at = 0; at <= heard.length && expected.length > 0; at++) {
        // A word prompted before this word was heard: it is counted as a mistake and the reader goes on.
        while (prompt < prompts.length && prompts[prompt] <= at) {
            if (cursor < expected.length) {
                start ??= cursor;
                fail(cursor, 'helped', null);
                cursor++;
                blocked = null;
                again = null;
            }

            prompt++;
        }

        if (at === heard.length || (start !== null && cursor >= expected.length)) {
            break;
        }

        if (start === null) {
            const begin = startAt(expected, heard, at, !!options.freeStart);

            if (begin === null) {
                continue;
            }

            start = cursor = begin;
        }

        const step = judge({ expected, start, cursor, again, blocked: blocked !== null, vowels: !!options.vowels }, heard, at);

        if (step.type === 'accept') {
            cursor += step.words;
            at += step.heard - 1;
            blocked = null;
            again = null;
        } else if (step.type === 'again') {
            again = step.at;
        } else if (step.type === 'mistake') {
            blocked = fail(cursor, step.kind, heard[at]);
            again = null;
        } else {
            again = null;
        }
    }

    // Words still being recognized move the reader on only when they are the right ones.
    const pending = heardWords(interim);
    let reached = cursor;
    let provisionalStart = start;

    for (let at = 0; at < pending.length && reached < expected.length; at++) {
        const word = comparable(pending[at]);
        const next = at + 1 < pending.length ? comparable(pending[at + 1]) : null;

        if (provisionalStart === null) {
            const begin = startAt(expected, pending, at, !!options.freeStart);

            if (begin === null || matchAt(expected, begin, word, next) === null) {
                continue;
            }

            provisionalStart = reached = begin;
        }

        const match = matchAt(expected, reached, word, next);

        if (match) {
            reached += match.words;
            at += match.heard - 1;
        } else if (!expected.slice(Math.max(provisionalStart, reached - REWIND), reached).some((earlier) => earlier.plain === word)) {
            break;
        }
    }

    const from = start ?? 0;
    let credit = 0;
    let right = 0;

    for (let position = from; position < cursor; position++) {
        const kind = kinds.get(position);

        if (kind === undefined) {
            credit++;
            right++;
        } else if (kind === 'vowel' || kind === 'letter') {
            credit += 0.5;
        }
    }

    const total = options.whole ? expected.length : cursor - from;

    return {
        start: provisionalStart,
        cursor,
        reached,
        mistakes,
        blocked: reached > cursor ? null : blocked,
        kinds,
        said: heard.length,
        finished: start !== null && cursor >= expected.length,
        score: total <= 0 ? 0 : Math.round((100 * credit) / total),
        right,
    };
}

const STATUS_ORDER: WordStatus[] = ['pending', 'correct', 'vowel', 'close', 'wrong'];

function statusOfKind(kind: MistakeKind): WordStatus {
    return kind === 'vowel' ? 'vowel' : kind === 'letter' ? 'close' : 'wrong';
}

function worseStatus(a: WordStatus, b: WordStatus): WordStatus {
    if (a === 'current' || b === 'current') {
        return 'current';
    }

    return STATUS_ORDER.indexOf(b) > STATUS_ORDER.indexOf(a) ? b : a;
}

/**
 * How to show each word (by ayah id, then word position): where the reader is in this recitation, and
 * the mistakes of the session (all the recitations since the page was opened) with their letters.
 */
export function wordMarks(expected: ExpectedWord[], progress: RecitationProgress | null, mistakes: RecitationMistake[]): Map<number, Map<number, WordMark>> {
    const marks = new Map<number, Map<number, WordMark>>();

    const markOf = (ayahId: number, index: number): WordMark => {
        const ayah = marks.get(ayahId) ?? new Map<number, WordMark>();
        const mark = ayah.get(index) ?? { status: 'pending', said: false, blocked: false, letters: [], vowels: [], heard: [] };
        ayah.set(index, mark);
        marks.set(ayahId, ayah);

        return mark;
    };

    if (progress && progress.start !== null) {
        for (let position = progress.start; position <= progress.reached && position < expected.length; position++) {
            const word = expected[position];
            const mark = markOf(word.ayahId, word.index);
            const kind = progress.kinds.get(position);

            if (position === progress.reached) {
                mark.status = 'current';
                mark.said = false;
                mark.blocked = progress.blocked !== null;
            } else {
                mark.status = worseStatus(mark.status, kind === undefined ? 'correct' : statusOfKind(kind));
                mark.said = true;
            }
        }
    }

    for (const mistake of mistakes) {
        const mark = markOf(mistake.ayahId, mistake.index);
        mark.status = worseStatus(mark.status, statusOfKind(mistake.kind));
        mark.letters = [...new Set([...mark.letters, ...mistake.letters])];
        mark.vowels = [...new Set([...mark.vowels, ...mistake.vowels])];

        if (mistake.heard !== null && !mark.heard.includes(mistake.heard)) {
            mark.heard.push(mistake.heard);
        }
    }

    return marks;
}

/**
 * The mushaf words said right so far in this recitation, to write them as the reader goes.
 */
export function recitedWords(expected: ExpectedWord[], progress: RecitationProgress): { ayahId: number; index: number; written: string }[] {
    const words: { ayahId: number; index: number; written: string }[] = [];

    if (progress.start === null) {
        return words;
    }

    for (let position = progress.start; position < progress.reached && position < expected.length; position++) {
        const word = expected[position];

        // A mushaf word made of several plain words is written once its last one is said.
        if (position + 1 < expected.length && sameWord(expected[position + 1], word)) {
            continue;
        }

        words.push({ ayahId: word.ayahId, index: word.index, written: word.written });
    }

    return words;
}
