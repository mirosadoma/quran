<?php

namespace Tests\Feature;

use App\Enums\StoryKind;
use App\Services\Quran;
use Closure;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Tests\TestCase;

/**
 * Every story file of resources/data/stories/{kind}/{slug}.json follows the schema the story pages read.
 */
class StoryFilesTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        // Validation messages in English, to read the failures.
        app()->setLocale('en');
    }

    public function test_every_story_file_follows_the_schema(): void
    {
        $errors = [];

        foreach (StoryKind::cases() as $kind) {
            foreach ($this->files($kind) as $file) {
                $name = "{$kind->value}/".basename($file);
                $story = json_decode((string) file_get_contents($file), true);

                if (! is_array($story)) {
                    $errors[] = "{$name}: not valid JSON (".json_last_error_msg().').';

                    continue;
                }

                if (preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', basename($file, '.json')) !== 1) {
                    $errors[] = "{$name}: the file name must be a slug (lowercase letters, digits and dashes).";
                }

                foreach (array_diff(array_keys($story), ['slug', 'order', 'title', 'summary', 'icon', 'tone', 'sections', 'lessons', 'audio']) as $key) {
                    $errors[] = "{$name}: unknown field [{$key}].";
                }

                foreach (Validator::make($story, $this->rules($kind, basename($file, '.json'), $story))->errors()->all() as $message) {
                    $errors[] = "{$name}: {$message}";
                }
            }
        }

        $this->assertNotEmpty($this->files(StoryKind::Kids));
        $this->assertSame([], $errors);
    }

    public function test_the_stories_of_a_library_have_different_orders(): void
    {
        $duplicates = [];

        foreach (StoryKind::cases() as $kind) {
            $files = [];

            foreach ($this->files($kind) as $file) {
                $order = json_decode((string) file_get_contents($file), true)['order'] ?? null;
                $files[(string) $order][] = basename($file);
            }

            foreach ($files as $order => $names) {
                if (count($names) > 1) {
                    $duplicates[] = "{$kind->value}: order {$order} is used by ".implode(', ', $names);
                }
            }
        }

        $this->assertSame([], $duplicates);
    }

    /**
     * @return list<string>
     */
    protected function files(StoryKind $kind): array
    {
        return glob(resource_path("data/stories/{$kind->value}/*.json")) ?: [];
    }

    /**
     * @param  array<string, mixed>  $story
     * @return array<string, mixed>
     */
    protected function rules(StoryKind $kind, string $slug, array $story): array
    {
        $quran = app(Quran::class);

        return [
            'slug' => ['required', 'string', Rule::in([$slug])],
            'order' => ['required', 'integer', 'min:1'],
            'title' => ['required', 'array:ar,en'],
            'title.ar' => ['required', 'string'],
            'title.en' => ['required', 'string'],
            'summary' => ['required', 'array:ar,en'],
            'summary.ar' => ['required', 'string'],
            'summary.en' => ['required', 'string'],
            'icon' => ['nullable', 'string', 'regex:/^[a-z0-9]+(-[a-z0-9]+)*$/'],
            'tone' => ['nullable', Rule::in(['emerald', 'sky', 'violet', 'amber', 'rose', 'teal'])],
            'sections' => ['required', 'array', 'list', 'min:1'],
            'sections.*' => ['array:heading,paragraphs,ayahs'],
            'sections.*.heading' => ['nullable', 'string'],
            'sections.*.paragraphs' => ['required', 'array', 'list', 'min:1'],
            // The Quran is never typed in a story: its text comes from the ayahs table.
            'sections.*.paragraphs.*' => ['required', 'string', 'not_regex:/[\x{FD3E}\x{FD3F}]/u'],
            'sections.*.ayahs' => ['nullable', 'array', 'list'],
            'sections.*.ayahs.*' => ['array:surah,from,to'],
            'sections.*.ayahs.*.surah' => ['required', 'integer', 'between:1,114'],
            'sections.*.ayahs.*.from' => ['required', 'integer', 'min:1'],
            'sections.*.ayahs.*.to' => [
                'required',
                'integer',
                'gte:sections.*.ayahs.*.from',
                function (string $attribute, mixed $value, Closure $fail) use ($story, $quran): void {
                    $surah = Arr::get($story, Str::replaceLast('.to', '.surah', $attribute));

                    if (is_int($surah) && is_int($value) && $value > $quran->ayahCount($surah)) {
                        $fail("The {$attribute} field is beyond the {$quran->ayahCount($surah)} ayahs of surah {$surah}.");
                    }
                },
            ],
            'lessons' => ['required', 'array', 'list', 'min:1', ...($kind === StoryKind::Kids ? ['max:3'] : [])],
            'lessons.*' => ['required', 'string'],
            'audio' => ['nullable', 'string', 'regex:/^(https?:\/\/|\/)\S+$/'],
        ];
    }
}
