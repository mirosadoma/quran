<?php

namespace Tests\Feature;

use App\Enums\StoryKind;
use App\Models\Ayah;
use App\Models\Reciter;
use App\Models\User;
use App\Services\StoryLibrary;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Illuminate\Testing\Fluent\AssertableJson;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class StoriesTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Folder of the story files the pages read during the test.
     */
    protected string $library;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        $this->library = storage_path('framework/testing/stories-'.Str::lower(Str::random(10)));
        $this->app->bind(StoryLibrary::class, fn (): StoryLibrary => new StoryLibrary($this->library));
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->library);

        parent::tearDown();
    }

    public function test_every_user_sees_the_kids_stories_in_their_order_without_their_text(): void
    {
        $this->story(StoryKind::Kids, 'the-second', ['order' => 2, 'icon' => 'cat', 'tone' => 'amber', 'sections' => [['heading' => null, 'paragraphs' => [str_repeat('كلمة ', 250)]]]]);
        $this->story(StoryKind::Kids, 'the-first', ['order' => 1]);
        $this->story(StoryKind::Prophets, 'nuh');

        foreach ([User::factory()->student()->create(), User::factory()->teacher()->create(), User::factory()->manager()->create(), User::factory()->admin()->create()] as $user) {
            $this->actingAs($user)
                ->get(route('kids-stories.index'))
                ->assertOk()
                ->assertInertia(fn (AssertableInertia $page) => $page
                    ->component('stories/index')
                    ->where('kind', 'kids')
                    ->has('stories', 2)
                    ->has('stories.0', fn (AssertableJson $story) => $story
                        ->where('slug', 'the-first')
                        ->where('order', 1)
                        ->where('title', ['ar' => 'قصة the-first', 'en' => 'Story the-first'])
                        ->where('summary', ['ar' => 'ملخص القصة', 'en' => 'The summary'])
                        ->where('icon', null)
                        ->where('tone', null)
                        ->where('minutes', 1))
                    ->where('stories.1.slug', 'the-second')
                    ->where('stories.1.icon', 'cat')
                    ->where('stories.1.tone', 'amber')
                    ->where('stories.1.minutes', 3));
        }
    }

    public function test_the_prophets_page_lists_only_the_stories_of_the_prophets(): void
    {
        $this->story(StoryKind::Prophets, 'nuh', ['order' => 3]);
        $this->story(StoryKind::Prophets, 'adam', ['order' => 1]);
        $this->story(StoryKind::Kids, 'the-first');

        $this->actingAs(User::factory()->student()->create())
            ->get(route('prophets-stories.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('stories/index')
                ->where('kind', 'prophets')
                ->has('stories', 2)
                ->where('stories.0.slug', 'adam')
                ->where('stories.1.slug', 'nuh'));
    }

    public function test_a_story_shows_its_ayahs_from_the_quran_text_with_the_stories_around_it(): void
    {
        $this->story(StoryKind::Prophets, 'adam', ['order' => 1]);
        $this->story(StoryKind::Prophets, 'hud', ['order' => 3]);
        $this->story(StoryKind::Prophets, 'nuh', [
            'order' => 2,
            'sections' => [
                ['heading' => 'دعوته لقومه', 'paragraphs' => ['دعا قومه.', 'صبر عليهم.'], 'ayahs' => [['surah' => 114, 'from' => 1, 'to' => 2]]],
                ['heading' => 'السفينة', 'paragraphs' => ['صنع السفينة.']],
            ],
            'lessons' => ['الصبر في الدعوة.'],
        ]);
        Ayah::factory()->create(['id' => 6221, 'surah' => 114, 'ayah' => 1, 'page' => 604, 'text' => 'نص الآية الأولى']);
        Ayah::factory()->create(['id' => 6222, 'surah' => 114, 'ayah' => 2, 'page' => 604, 'text' => 'نص الآية الثانية']);
        Ayah::factory()->create(['id' => 6223, 'surah' => 114, 'ayah' => 3, 'page' => 604, 'text' => 'نص الآية الثالثة']);
        Reciter::factory()->create();

        $this->actingAs(User::factory()->student()->create())
            ->get(route('prophets-stories.show', 'nuh'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('stories/show')
                ->where('kind', 'prophets')
                ->where('story.slug', 'nuh')
                ->where('story.sections.0.heading', 'دعوته لقومه')
                ->where('story.sections.0.paragraphs', ['دعا قومه.', 'صبر عليهم.'])
                ->where('story.sections.0.ayahs', [[
                    'surah' => 114,
                    'from' => 1,
                    'to' => 2,
                    'verses' => [['ayah' => 1, 'text' => 'نص الآية الأولى'], ['ayah' => 2, 'text' => 'نص الآية الثانية']],
                ]])
                ->where('story.sections.1.ayahs', [])
                ->where('story.lessons', ['الصبر في الدعوة.'])
                ->where('story.audio', null)
                ->where('previous.slug', 'adam')
                ->where('next.slug', 'hud')
                ->has('reciters', 1));
    }

    public function test_a_story_shows_the_reference_of_its_ayahs_while_the_quran_text_is_not_installed(): void
    {
        $this->story(StoryKind::Kids, 'the-first', ['sections' => [['heading' => null, 'paragraphs' => ['قصة.'], 'ayahs' => [['surah' => 2, 'from' => 153, 'to' => 153]]]]]);

        $this->actingAs(User::factory()->student()->create())
            ->get(route('kids-stories.show', 'the-first'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('story.sections.0.ayahs', [['surah' => 2, 'from' => 153, 'to' => 153, 'verses' => []]])
                ->where('previous', null)
                ->where('next', null));
    }

    public function test_an_unknown_story_is_not_found(): void
    {
        $this->story(StoryKind::Kids, 'the-first');
        $user = User::factory()->student()->create();

        $this->actingAs($user)->get(route('kids-stories.show', 'the-second'))->assertNotFound();
        $this->actingAs($user)->get(route('prophets-stories.show', 'the-first'))->assertNotFound();
    }

    public function test_guests_are_sent_to_the_login_page(): void
    {
        $this->get(route('kids-stories.index'))->assertRedirect(route('login'));
        $this->get(route('prophets-stories.show', 'nuh'))->assertRedirect(route('login'));
    }

    public function test_new_and_edited_story_files_show_without_clearing_the_cache(): void
    {
        $this->story(StoryKind::Kids, 'the-first');
        $user = User::factory()->student()->create();

        $this->actingAs($user)->get(route('kids-stories.index'))->assertInertia(fn (AssertableInertia $page) => $page->has('stories', 1));

        $this->story(StoryKind::Kids, 'the-first', ['title' => ['ar' => 'عنوان جديد أطول', 'en' => 'A longer new title']]);
        $this->story(StoryKind::Kids, 'the-second', ['order' => 2]);

        $this->actingAs($user)
            ->get(route('kids-stories.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('stories', 2)
                ->where('stories.0.title.ar', 'عنوان جديد أطول'));
    }

    public function test_files_that_are_not_stories_are_left_out(): void
    {
        $this->story(StoryKind::Kids, 'the-first');
        File::put("{$this->library}/kids/half-written.json", '{"slug": "half-written", "order": 2, "tit');
        File::put("{$this->library}/kids/Not_A_Slug.json", (string) file_get_contents("{$this->library}/kids/the-first.json"));

        $this->actingAs(User::factory()->student()->create())
            ->get(route('kids-stories.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('stories', 1)
                ->where('stories.0.slug', 'the-first'));
    }

    /**
     * Write a story file of the library read by the pages.
     *
     * @param  array<string, mixed>  $attributes
     */
    protected function story(StoryKind $kind, string $slug, array $attributes = []): void
    {
        File::ensureDirectoryExists("{$this->library}/{$kind->value}");
        File::put("{$this->library}/{$kind->value}/{$slug}.json", (string) json_encode([
            'slug' => $slug,
            'order' => 1,
            'title' => ['ar' => "قصة {$slug}", 'en' => "Story {$slug}"],
            'summary' => ['ar' => 'ملخص القصة', 'en' => 'The summary'],
            'sections' => [['heading' => null, 'paragraphs' => ['كان يا ما كان.']]],
            'lessons' => ['الصدق منجاة.'],
            'audio' => null,
            ...$attributes,
        ], JSON_UNESCAPED_UNICODE));
    }
}
