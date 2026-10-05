<?php

namespace App\Services;

/**
 * Turns the word glosses of Tafsir Al-Jalalayn into word meanings for the mushaf.
 *
 * Al-Jalalayn quotes the Quran fragment by fragment, each followed by its explanation:
 * «أعجاز» أصول «نخل» ... A one-word fragment followed by a short gloss is, for a rare
 * word, its meaning; so is the gloss of a short phrase for its last word («قلوب يومئذ
 * واجفة» خائفة قلقة), under stricter rules. Grammar notes, readings, the names of who or what the ayah speaks
 * about and explanations that continue the sentence are left out, so only plain
 * meanings remain (an admin can still correct or add any meaning from the mushaf).
 */
class JalalaynGlosses
{
    /**
     * Words appearing more often than this in the Quran are common enough to need no meaning.
     */
    protected const MAX_FREQUENCY = 12;

    protected const MAX_GLOSS_WORDS = 6;

    /**
     * Quoted phrases up to this length give the meaning of their last word.
     */
    protected const MAX_PHRASE_WORDS = 3;

    protected const MAX_PHRASE_GLOSS_WORDS = 5;

    protected const IGNORED_WORDS = ['الله', 'رب', 'قال', 'قالوا', 'الذين'];

    protected const FUNCTION_WORDS = [
        'عنها', 'عنه', 'عنهم', 'فيهم', 'فيها', 'فيه', 'معكم', 'معهم', 'معه', 'بانهم', 'فانه', 'انه', 'انهم', 'انها',
        'كانت', 'كان', 'كانوا', 'يكون', 'تكون', 'هنالك', 'ذلك', 'بذلك', 'فبذلك', 'هذا', 'هذه', 'هولا', 'الذي', 'التي',
        'الذين', 'لهم', 'لكم', 'لنا', 'منهم', 'منكم', 'عليهم', 'عليكم', 'اليهم', 'اليكم', 'بينهم', 'بينكم', 'لعلهم',
        'لعلكم', 'اذا', 'اذ', 'حتي', 'لما', 'كلما', 'ايهم', 'ايكم', 'فيهن', 'لهن', 'عليهن', 'منهن',
    ];

    /**
     * Single-word glosses that only point back at something (them, it, that...).
     */
    protected const POINTER_GLOSSES = ['ذلك', 'عنه', 'عنها', 'معهم', 'معه', 'معكم', 'لهم', 'عليهم', 'فيها', 'فيه', 'منهم', 'منه', 'هم', 'هو', 'هي', 'اي', 'ابدا'];

    /**
     * Glosses starting like this are grammar notes or readings, not meanings.
     */
    protected const GRAMMAR = '/^(خبر|مبتدأ|مفعول|نعت|حال|بدل|صفة|منصوب|مرفوع|مجرور|مصدر|فاعل|جواب|تمييز|ظرف|استئناف|معطوف|عطف|متعلق|ضمير|اسم|فعل|حرف|زائدة|للتأكيد|تأكيد|للتعليل|توكيد|بالتخفيف|بالتشديد|بالياء|بالتاء|بالنون|بالرفع|بالنصب|بالجر|بالإضافة|بالهمز|بالمد|بالقصر|مثقلا|مخففا|مشددا|بفتح|بضم|بكسر|بسكون|وفي قراءة|في قراءة|قراءة|وقرئ|الفاء|الواو|اللام|الباء|الهمزة|الطاء|التاء|النون|الياء|يا\s|هو\s|هي\s|هم\s|وهو|وهي|وهم|كما|أو\s|ثم\s)/u';

    /**
     * Glosses starting like this continue the sentence of the ayah instead of explaining the word.
     */
    protected const CONTINUATION = '/^(من|عن|في|على|إلى|الى|حين|إذا|إذ|به|بها|بهم|بكم|له|لها|لهم|لكم|منه|منها|منهم|عليه|عليها|عليهم|عليهن|فيه|فيها|فيهن|إليه|إليها|إليهم|إليهن|لهن|بهن|منهن|عما|مما|فيما|بما|منهما|عنهما|لهما|بهما|عليهما|إليهما|لنا|لي|معه|عند|قبل|بعد|مع|لأن|لأنه|ليس|لا|ما|أن|إن|قد|لم|لن|وما|ولا|الذي|التي|الذين|ذلك|هذا|هذه|شيئا|شيئاً)(\s|$)/u';

    /**
     * Glosses containing these words comment on the ayah or name a person instead of giving a meaning.
     */
    protected const COMMENTARY = '/صلى الله عليه وسلم|عليه السلام|أريد|يعني|المراد|بمعنى|يقول|فقلنا|قال|قيل|تعالى|جمع|مفرد|واحد|أيها|فقط|حال|نصب|الهمزة|بقطع|وصل|يبدل|أمر|يجب|ملتبس|متلبس|كما في|آية|أعلم|الفاعل|أتاه|منك|موسى|عيسى|إبراهيم|محمد|أخته|الله|كفار|فرعون|خطاب|فهو|مريد|استهزاء|إياهم|غيره|استفهام|تعجب|متعجب|أنزلناه|شرعا|نقتلهم|أقروا|كل ما|عطف على|تغليب|كرره|تأكيدا|علم ظهور/u';

    /**
     * @param  iterable<array{id: int, text: string}>  $ayahs  every ayah of the Quran (to know how rare a word is)
     * @param  array<int, string>  $tafsir  Al-Jalalayn text keyed by ayah id
     * @return list<array{ayah_id: int, position: int, word: string, meaning: string}>
     */
    public function extract(iterable $ayahs, array $tafsir): array
    {
        $ayahs = is_array($ayahs) ? $ayahs : iterator_to_array($ayahs, false);
        $frequency = [];

        foreach ($ayahs as $ayah) {
            foreach (explode(' ', $ayah['text']) as $word) {
                $bare = static::bare($word);
                $frequency[$bare] = ($frequency[$bare] ?? 0) + 1;
            }
        }

        $meanings = [];

        foreach ($ayahs as $ayah) {
            $text = $tafsir[$ayah['id']] ?? null;

            if ($text === null) {
                continue;
            }

            foreach ($this->glosses($ayah, $text, $frequency) as $meaning) {
                $meanings[] = $meaning;
            }
        }

        return $meanings;
    }

    /**
     * @param  array{id: int, text: string}  $ayah
     * @param  array<string, int>  $frequency
     * @return list<array{ayah_id: int, position: int, word: string, meaning: string}>
     */
    protected function glosses(array $ayah, string $tafsir, array $frequency): array
    {
        $words = explode(' ', $ayah['text']);
        $bareWords = array_map(static::bare(...), $words);
        $cursor = 0;
        $found = [];

        preg_match_all('/«([^»]+)»([^«]*)/u', $tafsir, $fragments, PREG_SET_ORDER);

        foreach ($fragments as [, $fragment, $explanation]) {
            $fragmentWords = preg_split('/\s+/u', trim($fragment)) ?: [];
            $target = static::bare((string) end($fragmentWords));
            $index = $this->indexOf($bareWords, $target, $cursor);

            if ($index === null) {
                continue;
            }

            // Keep following the ayah so a repeated word is matched at the right place.
            $cursor = $index + 1;

            if (count($fragmentWords) > self::MAX_PHRASE_WORDS) {
                continue;
            }

            $meaning = $this->meaning($words[$index], $target, $explanation, $frequency, phrase: count($fragmentWords) > 1);

            if ($meaning !== null) {
                $found[] = ['ayah_id' => $ayah['id'], 'position' => $index, 'word' => $words[$index], 'meaning' => $meaning];
            }
        }

        return $found;
    }

    /**
     * @param  list<string>  $bareWords
     */
    protected function indexOf(array $bareWords, string $target, int $from): ?int
    {
        foreach ([$target, 'و'.$target, 'ف'.$target] as $candidate) {
            for ($index = $from, $count = count($bareWords); $index < $count; $index++) {
                if ($bareWords[$index] === $candidate) {
                    return $index;
                }
            }
        }

        return null;
    }

    /**
     * The gloss of a word, or null when it is not a plain meaning. $phrase: the gloss explains
     * a quoted phrase ending with the word.
     *
     * @param  array<string, int>  $frequency
     */
    protected function meaning(string $original, string $target, string $explanation, array $frequency, bool $phrase = false): ?string
    {
        $word = static::bare($original);
        $stem = preg_replace('/^(و|ف)/u', '', $word) ?? $word;

        if (mb_strlen($target) <= 2
            || in_array($target, self::IGNORED_WORDS, true)
            || in_array($stem, self::FUNCTION_WORDS, true)
            || ($frequency[$word] ?? 0) > self::MAX_FREQUENCY) {
            return null;
        }

        $gloss = trim(preg_replace('/\s+/u', ' ', $explanation) ?? '');
        $explained = mb_strrpos($gloss, 'أي ');

        if ($explained !== false) {
            $gloss = mb_substr($gloss, $explained + 3);
        }

        $gloss = preg_split('/[،.؛:(\[{؟?]/u', $gloss)[0] ?? '';
        // "إقامة بدل من الجنة": keep the meaning, drop the grammar note after it.
        $gloss = preg_replace('/\s(و?(بدل|عطف|نعت|خبر|صفة|جواب|تأكيد|توكيد)|بالياء|بالتاء|بالنون|وفي قراءة|في قراءة|قراءة)(\s.*)?$/u', '', $gloss) ?? '';
        $gloss = preg_replace('/^[\s,،:؛\-]+|[\s,،:؛\-]+$/u', '', $gloss) ?? '';

        if ($gloss === ''
            || preg_match(self::GRAMMAR, $gloss)
            || preg_match(self::CONTINUATION, $gloss)
            || preg_match(self::COMMENTARY, $gloss)) {
            return null;
        }

        $glossWords = explode(' ', $gloss);
        $first = $glossWords[0];
        $definiteWord = preg_match('/^(ال|وال|فال|بال|لل|كال)/u', $word) === 1;

        if (count($glossWords) > ($phrase ? self::MAX_PHRASE_GLOSS_WORDS : self::MAX_GLOSS_WORDS)
            || static::bare($gloss) === $target
            // A definite noun given for a verb names who or what, it is not a meaning.
            || (($phrase || count($glossWords) <= 2) && str_starts_with($first, 'ال') && ! $definiteWord)
            // "كالزكاة" gives an example.
            || (str_starts_with($first, 'كال') && ! str_starts_with($stem, 'ك'))
            // "أكلها" / "حبالهم": a pronoun the word does not have points at something else.
            || (preg_match('/^\p{L}{3,}(ها|هم|هما|كم)$/u', static::letters($first))
                && ! preg_match('/(ه|ها|هم|هما|هن|ك|كم|كما|كن|نا|تم|تما|تن)$/u', static::letters($original)))
            // The gloss of a phrase belongs to its last word only when it has the same form.
            || ($phrase && ! static::sameForm($original, $first))
            // "بالقتل..." / "للإعانة..." explain the cause or the purpose.
            || (preg_match('/^(ب|ل(?!ا))/u', $first) && mb_substr($first, 0, 1) !== mb_substr($stem, 0, 1))
            // "والشر" / "فشدة" continue the verse unless the word itself starts with that letter.
            || (preg_match('/^[وف]/u', $first) && mb_substr($first, 0, 1) !== mb_substr($word, 0, 1))
            || (count($glossWords) === 1 && in_array(static::bare($first), self::POINTER_GLOSSES, true))) {
            return null;
        }

        return $gloss;
    }

    /**
     * Whether a gloss has the form of the word: definite for a definite word (الأجداث: القبور),
     * accusative for an accusative one (مدرارا: متتابعا), with a pronoun for a word ending with
     * one (خطبكم: شأنكم).
     */
    protected static function sameForm(string $word, string $gloss): bool
    {
        $letters = strtr(static::letters($word), ['ٱ' => 'ا']);
        $glossLetters = static::letters($gloss);

        if (preg_match('/\x{064B}/u', $word) && str_ends_with($letters, 'ا')) {
            return preg_match('/[اى]$/u', $glossLetters) === 1;
        }

        if (preg_match('/^(و|ف|ب|ك)?(ال|لل)/u', $letters)) {
            return preg_match('/^(و|ف|ب|ك|ل)?(ال|لل)/u', $glossLetters) === 1;
        }

        if (preg_match('/^\p{L}{2,}(ه|ها|هم|هما|هن|ك|كم|كما|كن|نا)$/u', $letters)) {
            return preg_match('/(ه|ها|هم|هما|هن|ك|كم|كما|كن|نا|ي)$/u', $glossLetters) === 1;
        }

        return true;
    }

    /**
     * The word as written, without diacritics and Quranic marks.
     */
    protected static function letters(string $text): string
    {
        return preg_replace('/[\x{0610}-\x{061A}\x{064B}-\x{065F}\x{0670}\x{06D6}-\x{06ED}\x{0640}]/u', '', $text) ?? $text;
    }

    /**
     * The letters of a word only: no diacritics, Quranic marks or hamza, one form of alef, ya and ha.
     */
    public static function bare(string $text): string
    {
        $text = preg_replace('/[\x{0610}-\x{061A}\x{064B}-\x{065F}\x{0670}\x{06D6}-\x{06ED}\x{0640}]/u', '', $text) ?? $text;
        $text = strtr($text, ['ٱ' => 'ا', 'أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ى' => 'ي', 'ة' => 'ه', 'ؤ' => 'و', 'ئ' => 'ي', 'ء' => '']);

        return preg_replace('/[^\x{0621}-\x{064A}]/u', '', $text) ?? $text;
    }
}
