<?php

namespace App\Services;

use App\Enums\StoryKind;
use App\Models\Ayah;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * The stories for children and the stories of the prophets, to read or to listen to.
 * Every story is a JSON file, resources/data/stories/{kind}/{slug}.json. The list of a library
 * is cached forever under a key made from its files and their modification times, so a new or
 * edited story shows at once without clearing the cache. Quran passages are only references
 * (surah and ayahs): their text always comes from the ayahs table.
 */
class StoryLibrary
{
    /**
     * Words read (or heard) in a minute, to estimate how long a story takes.
     */
    public const WORDS_PER_MINUTE = 120;

    /**
     * @param  string|null  $path  Folder holding a folder per kind (resources/data/stories by default).
     */
    public function __construct(protected ?string $path = null) {}

    /**
     * The stories of a library sorted by their order, without their text.
     *
     * @return list<array{slug: string, order: int, title: array{ar: string, en: string}, summary: array{ar: string, en: string}, icon: string|null, tone: string|null, minutes: int}>
     */
    public function all(StoryKind $kind): array
    {
        $files = $this->files($kind);
        $version = md5(implode('|', array_map(fn (string $file): string => $file.'@'.filemtime($file).'#'.filesize($file), $files)));

        return Cache::rememberForever("stories.{$kind->value}.{$version}", function () use ($files): array {
            $stories = [];

            foreach ($files as $slug => $file) {
                $story = $this->read($file);

                if ($story !== null) {
                    $stories[] = $this->summary($slug, $story);
                }
            }

            usort($stories, fn (array $first, array $second): int => [$first['order'], $first['slug']] <=> [$second['order'], $second['slug']]);

            return $stories;
        });
    }

    /**
     * A whole story with the text of its Quran passages, or null when the library has no such story.
     *
     * @return array{slug: string, order: int, title: array{ar: string, en: string}, summary: array{ar: string, en: string}, icon: string|null, tone: string|null, minutes: int, sections: list<array{heading: string|null, paragraphs: list<string>, ayahs: list<array{surah: int, from: int, to: int, verses: list<array{ayah: int, text: string}>}>}>, lessons: list<string>, audio: string|null}|null
     */
    public function find(StoryKind $kind, string $slug): ?array
    {
        if (! in_array($slug, array_column($this->all($kind), 'slug'), true)) {
            return null;
        }

        $story = $this->read($this->directory($kind)."/{$slug}.json");

        if ($story === null) {
            return null;
        }

        $sections = array_values(array_filter($story['sections'], 'is_array'));
        $texts = $this->ayahTexts(array_merge(...array_map(fn (array $section): array => array_values($section['ayahs'] ?? []), $sections)));

        return [
            ...$this->summary($slug, $story),
            'sections' => array_map(fn (array $section): array => [
                'heading' => $section['heading'] ?? null,
                'paragraphs' => array_values($section['paragraphs'] ?? []),
                'ayahs' => array_map(fn (array $passage): array => $this->passage($passage, $texts), array_values($section['ayahs'] ?? [])),
            ], $sections),
            'lessons' => array_values($story['lessons'] ?? []),
            'audio' => $story['audio'] ?? null,
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

    protected function directory(StoryKind $kind): string
    {
        return ($this->path ?? resource_path('data/stories'))."/{$kind->value}";
    }

    /**
     * The story files of a library keyed by their slug (the name of the file).
     *
     * @return array<string, string>
     */
    protected function files(StoryKind $kind): array
    {
        // The modification times make the cache key: never read them from PHP's stat cache.
        clearstatcache();

        $files = [];

        foreach (glob($this->directory($kind).'/*.json') ?: [] as $file) {
            $slug = basename($file, '.json');

            if (preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $slug) === 1) {
                $files[$slug] = $file;
            }
        }

        return $files;
    }

    /**
     * A story file, or null when it is not a story (a file still being written, for instance).
     *
     * @return array<string, mixed>|null
     */
    protected function read(string $file): ?array
    {
        $story = json_decode((string) file_get_contents($file), true);

        if (! is_array($story) || ! is_array($story['title'] ?? null) || ! is_array($story['summary'] ?? null) || ! is_array($story['sections'] ?? null)) {
            return null;
        }

        return $story;
    }

    /**
     * What the list of the library shows of a story.
     *
     * @param  array<string, mixed>  $story
     * @return array{slug: string, order: int, title: array{ar: string, en: string}, summary: array{ar: string, en: string}, icon: string|null, tone: string|null, minutes: int}
     */
    protected function summary(string $slug, array $story): array
    {
        return [
            'slug' => $slug,
            'order' => (int) ($story['order'] ?? 0),
            'title' => $this->localized($story['title']),
            'summary' => $this->localized($story['summary']),
            'icon' => is_string($story['icon'] ?? null) ? $story['icon'] : null,
            'tone' => is_string($story['tone'] ?? null) ? $story['tone'] : null,
            'minutes' => $this->minutes($story),
        ];
    }

    /**
     * @param  array<string, mixed>  $value
     * @return array{ar: string, en: string}
     */
    protected function localized(array $value): array
    {
        $arabic = (string) ($value['ar'] ?? '');

        return ['ar' => $arabic, 'en' => (string) ($value['en'] ?? $arabic)];
    }

    /**
     * Minutes to read or listen to a story: its headings, paragraphs and lessons.
     *
     * @param  array<string, mixed>  $story
     */
    protected function minutes(array $story): int
    {
        $words = collect($story['sections'])
            ->filter(fn (mixed $section): bool => is_array($section))
            ->flatMap(fn (array $section): array => [$section['heading'] ?? '', ...($section['paragraphs'] ?? [])])
            ->merge($story['lessons'] ?? [])
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
