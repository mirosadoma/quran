<?php

namespace App\Services;

use App\Enums\StoryKind;
use App\Models\Ayah;
use App\Models\Story;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * The stories for children and the stories of the prophets, to read or to listen to.
 * They live in the stories table (installed from database/data/stories by StorySeeder).
 * Quran passages are only references (surah and ayahs): their text always comes from the ayahs table.
 */
class StoryLibrary
{
    /**
     * Words read (or heard) in a minute, to estimate how long a story takes.
     */
    public const WORDS_PER_MINUTE = 120;

    /**
     * The stories of a library sorted by their order, without their text.
     *
     * @return list<array{slug: string, order: int, title: array{ar: string, en: string}, summary: array{ar: string, en: string}, icon: string|null, tone: string|null, minutes: int}>
     */
    public function all(StoryKind $kind): array
    {
        return Story::query()
            ->ofKind($kind)
            ->ordered()
            ->get()
            ->map(fn (Story $story): array => $this->summary($story))
            ->all();
    }

    /**
     * A whole story with the text of its Quran passages, or null when the library has no such story.
     *
     * @return array{slug: string, order: int, title: array{ar: string, en: string}, summary: array{ar: string, en: string}, icon: string|null, tone: string|null, minutes: int, sections: list<array{heading: string|null, paragraphs: list<string>, ayahs: list<array{surah: int, from: int, to: int, verses: list<array{ayah: int, text: string}>}>}>, lessons: list<string>, audio: string|null}|null
     */
    public function find(StoryKind $kind, string $slug): ?array
    {
        $story = Story::query()->ofKind($kind)->where('slug', $slug)->first();

        if ($story === null) {
            return null;
        }

        $sections = array_values(array_filter($story->sections ?? [], 'is_array'));
        $texts = $this->ayahTexts(array_merge(...array_map(fn (array $section): array => array_values($section['ayahs'] ?? []), $sections)));

        return [
            ...$this->summary($story),
            'sections' => array_map(fn (array $section): array => [
                'heading' => $section['heading'] ?? null,
                'paragraphs' => array_values($section['paragraphs'] ?? []),
                'ayahs' => array_map(fn (array $passage): array => $this->passage($passage, $texts), array_values($section['ayahs'] ?? [])),
            ], $sections),
            'lessons' => array_values($story->lessons ?? []),
            'audio' => $story->audio,
        ];
    }

    /**
     * The stories before and after a story of the library, to move from one to the next.
     *
     * @return array{previous: array{slug: string, order: int, title: array{ar: string, en: string}, summary: array{ar: string, en: string}, icon: string|null, tone: string|null, minutes: int}|null, next: array{slug: string, order: int, title: array{ar: string, en: string}, summary: array{ar: string, en: string}, icon: string|null, tone: string|null, minutes: int}|null}
     */
    public function neighbours(StoryKind $kind, string $slug): array
    {
        $stories = $this->all($kind);
        $position = array_search($slug, array_column($stories, 'slug'), true);

        if ($position === false) {
            return ['previous' => null, 'next' => null];
        }

        return [
            'previous' => $stories[$position - 1] ?? null,
            'next' => $stories[$position + 1] ?? null,
        ];
    }

    /**
     * What the list of the library shows of a story.
     *
     * @return array{slug: string, order: int, title: array{ar: string, en: string}, summary: array{ar: string, en: string}, icon: string|null, tone: string|null, minutes: int}
     */
    protected function summary(Story $story): array
    {
        return [
            'slug' => $story->slug,
            'order' => $story->sort_order,
            'title' => ['ar' => $story->title, 'en' => $story->title_en ?: $story->title],
            'summary' => ['ar' => $story->summary, 'en' => $story->summary_en ?: $story->summary],
            'icon' => $story->icon,
            'tone' => $story->tone,
            'minutes' => $this->minutes($story),
        ];
    }

    /**
     * Minutes to read or listen to a story: its headings, paragraphs and lessons.
     */
    protected function minutes(Story $story): int
    {
        $words = collect($story->sections ?? [])
            ->filter(fn (mixed $section): bool => is_array($section))
            ->flatMap(fn (array $section): array => [$section['heading'] ?? '', ...($section['paragraphs'] ?? [])])
            ->merge($story->lessons ?? [])
            ->sum(fn (mixed $text): int => (int) preg_match_all('/\S+/u', is_string($text) ? $text : ''));

        return max(1, (int) ceil($words / self::WORDS_PER_MINUTE));
    }

    /**
     * The text of the ayahs of the passages keyed by "surah:ayah" (none while the Quran text is not installed).
     *
     * @param  list<array<string, mixed>>  $passages
     * @return Collection<string, string>
     */
    protected function ayahTexts(array $passages): Collection
    {
        if ($passages === []) {
            return collect();
        }

        return Ayah::query()
            ->where(function (Builder $query) use ($passages): void {
                foreach ($passages as $passage) {
                    $query->orWhere(fn (Builder $range): Builder => $range
                        ->where('surah', (int) $passage['surah'])
                        ->whereBetween('ayah', [(int) $passage['from'], (int) $passage['to']]));
                }
            })
            ->get(['surah', 'ayah', 'text'])
            ->mapWithKeys(fn (Ayah $ayah): array => ["{$ayah->surah}:{$ayah->ayah}" => $ayah->text]);
    }

    /**
     * A Quran passage of the story with the text of its ayahs.
     *
     * @param  array<string, mixed>  $passage
     * @param  Collection<string, string>  $texts
     * @return array{surah: int, from: int, to: int, verses: list<array{ayah: int, text: string}>}
     */
    protected function passage(array $passage, Collection $texts): array
    {
        $surah = (int) $passage['surah'];
        $from = (int) $passage['from'];
        $to = max($from, (int) $passage['to']);
        $verses = [];

        foreach (range($from, $to) as $ayah) {
            if ($texts->has("{$surah}:{$ayah}")) {
                $verses[] = ['ayah' => $ayah, 'text' => $texts->get("{$surah}:{$ayah}")];
            }
        }

        return ['surah' => $surah, 'from' => $from, 'to' => $to, 'verses' => $verses];
    }
}
