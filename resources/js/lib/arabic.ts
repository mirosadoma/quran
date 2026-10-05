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
