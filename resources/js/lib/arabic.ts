/**
 * Helpers for the Arabic text of the Quran.
 */

/** Diacritics, Quranic annotation marks and tatweel. */
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

/**
 * The letters of a word as written, without diacritics and marks; every alef form becomes ا.
 */
export function plainLetters(word: string): string {
    return word.replace(MARKS, '').replace(/[ٱأإآ]/g, 'ا');
}

/**
 * The name of Allah with its attached letters: الله، والله، بالله، تالله، لله، فلله، اللهم، ءآلله.
 * Words such as اللهو and اللهب are not matched.
 */
const JALALAH = /^(?:[اوف]?[بت]?الله|[اوف]?لله)م?$/;

export function isJalalah(word: string): boolean {
    return JALALAH.test(plainLetters(word).replace(/ء/g, ''));
}

/**
 * Whether a token of the text has letters (pause marks such as ۖ and the signs ۞ ۩ have none).
 */
export function hasLetters(token: string): boolean {
    return /[ء-ي]/.test(token);
}

/** A diacritic or Quranic mark, written over or under the letter before it. */
const MARK = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿ]/;

/** Fatha, damma and kasra, with their tanween (also the open tanween of some mushafs). */
const FATHA = /[ًࣰَ]/;
const DAMMA = /[ٌࣱُ]/;
const KASRA = /[ٍࣲِ]/;
const SHORT_VOWELS = /[ً-ࣰِ-ࣲ]/;

/**
 * The letters of a word, each with its diacritics and marks (بِسْمِ → بِ سْ مِ). A tatweel starts its own
 * part: in the mushaf it carries a hamza or a small alef (يَسْـَٔلُونَ).
 */
export function letterClusters(word: string): string[] {
    const clusters: string[] = [];

    for (const char of word) {
        if (MARK.test(char) && clusters.length > 0) {
            clusters[clusters.length - 1] += char;
        } else {
            clusters.push(char);
        }
    }

    return clusters;
}

/**
 * The letter of a cluster for comparing a recitation with the mushaf: every hamza (on any seat) is ء,
 * the alef forms ا, alef maqsura ي and ta marbuta ه; '' for what is not a letter.
 */
export function letterKey(cluster: string): string {
    const base = cluster[0] ?? '';

    if (/[ٕٔ]/.test(cluster) || /[أإآؤئء]/.test(base)) {
        return 'ء';
    }

    if (base === 'ٱ') {
        return 'ا';
    }

    if (base === 'ى') {
        return 'ي';
    }

    if (base === 'ة') {
        return 'ه';
    }

    return /[ء-ي]/.test(base) ? base : '';
}

export type Vowel = 'a' | 'u' | 'i';

/**
 * The short vowel on a letter: fatha (or fathatan), damma (or dammatan) or kasra (or kasratan).
 */
export function vowelOf(cluster: string): Vowel | null {
    for (const char of cluster) {
        if (FATHA.test(char)) {
            return 'a';
        }

        if (DAMMA.test(char)) {
            return 'u';
        }

        if (KASRA.test(char)) {
            return 'i';
        }
    }

    return null;
}

/**
 * Whether a text has short vowels (the speech recognition of the browser writes none).
 */
export function hasVowels(text: string): boolean {
    return SHORT_VOWELS.test(text);
}

/**
 * A text without the vowel of its last letter: where the reader stops (waqf) the last letter is read
 * with a sukun, whatever its written vowel.
 */
export function withoutFinalVowel(text: string): string {
    return text.trim().replace(/[ً-ࣰْ-ࣲ]+$/, '');
}

/**
 * A word reduced for comparison: no diacritics, one form of alef, ya, ta marbuta and hamza.
 * Speech recognition and the mushaf spell some letters differently; these differences are not mistakes.
 */
export function comparable(word: string): string {
    return plainLetters(word)
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/ؤ/g, 'و')
        .replace(/ئ/g, 'ي')
        .replace(/ء/g, '')
        .replace(/[^ء-ي]/g, '');
}
