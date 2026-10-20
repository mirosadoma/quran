<?php

namespace Database\Seeders;

use App\Enums\StoryKind;
use App\Models\Story;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

/**
 * The stories for children and the stories of the prophets, one JSON file per story in
 * database/data/stories/{kind}/{slug}.json (the name of the file is the slug of the story).
 * Running it again refreshes the stories from their files; a file that is not a story is left out.
 */
class StorySeeder extends Seeder
{
    /**
     * @param  string|null  $path  Folder holding a folder per kind (database/data/stories by default).
     */
    public function __construct(protected ?string $path = null) {}

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach (StoryKind::cases() as $kind) {
            foreach (File::glob($this->directory($kind).'/*.json') as $file) {
                $slug = basename($file, '.json');
                $story = json_decode(File::get($file), true);

                if (preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $slug) !== 1 || ! $this->isStory($story)) {
                    continue;
                }

                Story::query()->updateOrCreate(['kind' => $kind->value, 'slug' => $slug], [
                    'sort_order' => (int) ($story['order'] ?? 0),
                    'title' => (string) ($story['title']['ar'] ?? ''),
                    'title_en' => (string) ($story['title']['en'] ?? $story['title']['ar'] ?? ''),
                    'summary' => (string) ($story['summary']['ar'] ?? ''),
                    'summary_en' => (string) ($story['summary']['en'] ?? $story['summary']['ar'] ?? ''),
                    'icon' => is_string($story['icon'] ?? null) ? $story['icon'] : null,
                    'tone' => is_string($story['tone'] ?? null) ? $story['tone'] : null,
                    'sections' => $this->sections($story['sections']),
                    'lessons' => array_values(array_filter($story['lessons'] ?? [], 'is_string')),
                    'audio' => is_string($story['audio'] ?? null) ? $story['audio'] : null,
                ]);
            }
        }
    }

    /**
     * A file is a story when it has a title, a summary and sections.
     *
     * @phpstan-assert-if-true array{title: array<string, mixed>, summary: array<string, mixed>, sections: array<mixed>} $story
     */
    protected function isStory(mixed $story): bool
    {
        return is_array($story) && is_array($story['title'] ?? null) && is_array($story['summary'] ?? null) && is_array($story['sections'] ?? null);
    }

    /**
     * The sections of a story in one shape: a heading, paragraphs and Quran passages.
     *
     * @param  array<mixed>  $sections
     * @return list<array{heading: string|null, paragraphs: list<string>, ayahs: list<array{surah: int, from: int, to: int}>}>
     */
    protected function sections(array $sections): array
    {
        $result = [];

        foreach ($sections as $section) {
            if (! is_array($section)) {
                continue;
            }

            $result[] = [
                'heading' => is_string($section['heading'] ?? null) ? $section['heading'] : null,
                'paragraphs' => array_values(array_filter($section['paragraphs'] ?? [], 'is_string')),
                'ayahs' => array_values(array_map(fn (array $passage): array => [
                    'surah' => (int) $passage['surah'],
                    'from' => (int) $passage['from'],
                    'to' => (int) $passage['to'],
                ], array_filter($section['ayahs'] ?? [], fn (mixed $passage): bool => is_array($passage) && isset($passage['surah'], $passage['from'], $passage['to'])))),
            ];
        }

        return $result;
    }

    protected function directory(StoryKind $kind): string
    {
        return ($this->path ?? database_path('data/stories'))."/{$kind->value}";
    }
}
