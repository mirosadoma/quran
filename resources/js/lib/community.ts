/**
 * Helpers of the questions community.
 */

/** Diacritics, Quranic marks and tatweel (the same marks App\Services\Mushaf::normalize() removes). */
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;

const LETTER_FORMS: Record<string, string> = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ى': 'ي', 'ة': 'ه', 'ؤ': 'و', 'ئ': 'ي' };

/**
 * Text reduced the way the server searches it (App\Services\CommunitySearch::normalize()): no diacritics,
 * one form of alef, ya, ta marbuta and hamza, lower case, western digits, only letters and digits.
 */
export function searchable(text: string): string {
    return text
        .replace(MARKS, '')
        .replace(/[أإآٱىةؤئ]/g, (letter) => LETTER_FORMS[letter] ?? letter)
        .toLowerCase()
        .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
        .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim();
}

/**
 * Whether a word of a text contains one of the searched words (already reduced by the server).
 */
export function matchesAny(word: string, terms: string[]): boolean {
    const reduced = searchable(word);

    return reduced !== '' && terms.some((term) => reduced.includes(term));
}
