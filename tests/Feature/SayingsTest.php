<?php

namespace Tests\Feature;

use App\Enums\SayingKind;
use App\Models\Saying;
use App\Models\SayingCategory;
use App\Models\User;
use Database\Seeders\SayingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class SayingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_every_user_sees_the_sayings_and_stories_by_category_in_their_order(): void
    {
        $stories = SayingCategory::factory()->create(['slug' => 'stories', 'name' => 'قصص وعبر', 'sort_order' => 2]);
        $companions = SayingCategory::factory()->create(['slug' => 'companions', 'name' => 'أقوال الصحابة', 'icon' => 'users', 'color' => 'sky', 'sort_order' => 1]);
        Saying::factory()->for($companions, 'category')->create(['text' => 'قيمة كل امرئ ما يحسن.', 'attribution' => 'علي بن أبي طالب رضي الله عنه', 'sort_order' => 2]);
        Saying::factory()->for($companions, 'category')->create(['text' => 'حاسبوا أنفسكم قبل أن تحاسبوا.', 'source' => 'أحمد في الزهد', 'sort_order' => 1]);
        Saying::factory()->for($stories, 'category')->story()->create(['hadith_collection' => 'bukhari', 'hadith_number' => 3470]);

        foreach ([User::factory()->student()->create(), User::factory()->teacher()->create(), User::factory()->admin()->create()] as $user) {
            $this->actingAs($user)
                ->get(route('sayings.index'))
                ->assertOk()
                ->assertInertia(fn (AssertableInertia $page) => $page
                    ->component('sayings/index')
                    ->has('categories', 2)
                    ->where('categories.0.slug', 'companions')
                    ->where('categories.0.color', 'sky')
                    ->has('categories.0.sayings', 2)
                    ->where('categories.0.sayings.0.text', 'حاسبوا أنفسكم قبل أن تحاسبوا.')
                    ->where('categories.0.sayings.0.kind', 'saying')
                    ->where('categories.0.sayings.0.source', 'أحمد في الزهد')
                    ->where('categories.0.sayings.0.hadith', null)
                    ->where('categories.1.slug', 'stories')
                    ->where('categories.1.sayings.0.kind', 'story')
                    ->where('categories.1.sayings.0.title', 'قاتل المائة نفس')
                    ->where('categories.1.sayings.0.lesson', 'لا ذنب يغلق باب التوبة.')
                    ->where('categories.1.sayings.0.hadith', ['collection' => 'bukhari', 'number' => 3470]));
        }
    }

    public function test_guests_are_sent_to_the_login_page(): void
    {
        $this->get(route('sayings.index'))->assertRedirect(route('login'));
    }

    public function test_the_seeder_installs_the_sayings_of_the_platform_and_refreshes_them(): void
    {
        (new SayingSeeder)->run();
        // Running it again changes nothing.
        (new SayingSeeder)->run();

        $file = json_decode(File::get(database_path('data/sayings.json')), true);
        $this->assertSame(count($file), SayingCategory::query()->count());
        $this->assertSame(array_sum(array_map(fn (array $category): int => count($category['items']), $file)), Saying::query()->count());
        $this->assertGreaterThan(0, Saying::query()->where('kind', SayingKind::Story->value)->count());

        $stories = SayingCategory::query()->where('slug', 'stories')->with('sayings')->sole();
        $story = $stories->sayings->first();
        $this->assertSame(SayingKind::Story, $story->kind);
        $this->assertNotEmpty($story->title);
        $this->assertNotEmpty($story->lesson);
        $this->assertNotNull($story->hadith_collection);
    }
}
