<?php

namespace App\Services;

use App\Models\CommunityPost;
use App\Models\CommunityReply;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

/**
 * Finds the questions of the community that look like what the user is asking, so a question
 * asked before (and its answers) is found again. Words are compared without diacritics or
 * letter forms; a question matches when its title, its details or one of its replies has any
 * of the words, and the questions matching more of them come first.
 */
class CommunitySearch
{
    /**
     * Longest search taken into account (in characters).
     */
    public const MAX_LENGTH = 200;

    /**
     * Most words of a search that are looked for.
     */
    public const MAX_WORDS = 8;

    /**
     * Words too common in questions to tell them apart: particles and pronouns, greetings, and the
     * words most questions start with. A search made only of them still looks for them.
     */
    protected const COMMON_WORDS = 'في من على عن إلى ما ماذا هل هو هي هم هن أن إن أنا نحن أنت أنتم لو لا لم لن قد ثم أو أم بل '
        .'كيف لماذا متى أين كم أي كل بعض مع عند بعد قبل حتى إذا كان كانت يكون هذا هذه ذلك تلك هناك هنا الذي التي الذين '
        .'لي له لها لهم به بها فيه فيها منه منها عليه عليها عنه أيضا جدا لكن ولكن غير بين '
        .'ولا وهل وما وفي ومن وعلى وهو وهي وأن وإن وإذا فهل فما '
        .'السلام عليكم ورحمة الله وبركاته شيخ شيخنا الشيخ فضيلة فضيلتكم سؤال سؤالي استفسار حكم يجوز جزاكم جزاك خيرا '
        .'the an and or of to in on at is are was be it this that what how why when where who can do does my me you your for with';

    /**
     * The common words, normalized, as keys.
     *
     * @var array<string, int>|null
     */
    protected static ?array $commonWords = null;

    /**
     * Text reduced for searching, as it is stored with the questions and their replies: the
     * mushaf's normalization (no diacritics or tatweel, one form of alef, ya, ta marbuta and
     * hamza), lower case, western digits, and only letters and digits with one space between words.
     */
    public static function normalize(?string $text): string
    {
        $text = mb_strtolower(Mushaf::normalize((string) $text));
        $text = strtr($text, [
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
        ]);

        return trim(preg_replace('/[^\p{L}\p{N}]+/u', ' ', $text) ?? $text);
    }

    /**
     * What a search looks for: its words (without the common ones, and without "al-" and the
     * letters attached before it, so "الصلاة" also finds "صلاة") and the whole search as a phrase.
     *
     * @return array{words: list<string>, phrase: string|null}
     */
    public function terms(?string $search): array
    {
        $normalized = static::normalize(mb_substr((string) $search, 0, self::MAX_LENGTH));
        $tokens = array_values(array_filter(explode(' ', $normalized), fn (string $token): bool => mb_strlen($token) >= 2));
        $words = array_values(array_filter($tokens, fn (string $token): bool => ! isset(static::commonWords()[$token])));

        if ($words === []) {
            $words = $tokens;
        }

        $words = array_values(array_unique(array_map(fn (string $word): string => $this->stem($word), $words)));

        return [
            'words' => array_slice($words, 0, self::MAX_WORDS),
            'phrase' => str_contains($normalized, ' ') ? $normalized : null,
        ];
    }

    /**
     * Keep the questions having any of the words (or at least the minimum number of them), best
     * matches first: a word counts more in the title than in the details, and more there than in
     * a reply; the whole phrase counts most. Without words the query is left as it is.
     *
     * @param  Builder<CommunityPost>  $query
     * @param  array{words: list<string>, phrase: string|null}  $terms
     * @return Builder<CommunityPost>
     */
    public function apply(Builder $query, array $terms, int $minimumWords = 1): Builder
    {
        if ($terms['words'] === []) {
            return $query;
        }

        $posts = $query->getModel()->getTable();
        $replies = (new CommunityReply)->getTable();
        $patterns = array_map(fn (string $word): string => $this->pattern($word), $terms['words']);
        $inReplies = "exists (select 1 from {$replies} where {$replies}.community_post_id = {$posts}.id and {$replies}.search_body like ? escape '!')";
        $weigh = fn (int $title, int $details, int $reply): string => "case when {$posts}.search_title like ? escape '!' then {$title} "
            ."when {$posts}.search_body like ? escape '!' then {$details} when {$inReplies} then {$reply} else 0 end";

        $query->where(function (Builder $query) use ($patterns, $posts, $replies): void {
            foreach ($patterns as $pattern) {
                $query->orWhereRaw("{$posts}.search_title like ? escape '!'", [$pattern])
                    ->orWhereRaw("{$posts}.search_body like ? escape '!'", [$pattern]);
            }

            $query->orWhereHas('replies', function (Builder $query) use ($patterns, $replies): void {
                $query->where(function (Builder $query) use ($patterns, $replies): void {
                    foreach ($patterns as $pattern) {
                        $query->orWhereRaw("{$replies}.search_body like ? escape '!'", [$pattern]);
                    }
                });
            });
        });

        $minimumWords = min($minimumWords, count($patterns));

        if ($minimumWords > 1) {
            $query->whereRaw(
                '('.implode(' + ', array_fill(0, count($patterns), $weigh(1, 1, 1))).') >= ?',
                [...$this->forEachPlace($patterns), $minimumWords],
            );
        }

        $score = array_fill(0, count($patterns), $weigh(3, 2, 1));
        $bindings = $this->forEachPlace($patterns);

        if ($terms['phrase'] !== null) {
            $score[] = $weigh(8, 5, 3);
            array_push($bindings, ...$this->forEachPlace([$this->pattern($terms['phrase'])]));
        }

        return $query->orderByRaw('('.implode(' + ', $score).') desc', $bindings);
    }

    /**
     * The questions most like a text (a question being written, or another question): they have at
     * least two of its words (its only word, for a text of one word).
     *
     * @return Collection<int, CommunityPost>
     */
    public function similar(string $text, ?CommunityPost $except = null, int $limit = 5): Collection
    {
        $terms = $this->terms($text);

        if ($terms['words'] === []) {
            return new Collection;
        }

        return $this->apply(CommunityPost::query(), $terms, minimumWords: 2)
            ->when($except !== null, fn (Builder $query) => $query->whereKeyNot($except->id))
            ->withReplyCounts()
            ->latest()
            ->orderByDesc('id')
            ->limit($limit)
            ->get();
    }

    /**
     * The word without "al-" and the letter attached before it, when at least three letters remain
     * (so "الله" or "الحج" are kept whole).
     */
    protected function stem(string $word): string
    {
        foreach (['وال', 'فال', 'بال', 'كال', 'لل', 'ال'] as $prefix) {
            if (str_starts_with($word, $prefix) && mb_strlen($word) - mb_strlen($prefix) >= 3) {
                return mb_substr($word, mb_strlen($prefix));
            }
        }

        return $word;
    }

    /**
     * The bindings of the patterns in a weighed match: each one for the title, the details and the replies.
     *
     * @param  list<string>  $patterns
     * @return list<string>
     */
    protected function forEachPlace(array $patterns): array
    {
        return array_merge(...array_map(fn (string $pattern): array => [$pattern, $pattern, $pattern], $patterns));
    }

    /**
     * A "contains" pattern for LIKE ... ESCAPE '!', the same in every database.
     */
    protected function pattern(string $text): string
    {
        return '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $text).'%';
    }

    /**
     * @return array<string, int>
     */
    protected static function commonWords(): array
    {
        return static::$commonWords ??= array_flip(explode(' ', static::normalize(self::COMMON_WORDS)));
    }
}
