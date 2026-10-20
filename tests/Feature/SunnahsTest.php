<?php

namespace Tests\Feature;

use App\Models\Sunnah;
use App\Models\SunnahCategory;
use App\Models\User;
use Database\Seeders\SunnahSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class SunnahsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_every_user_sees_the_sunnahs_by_category_in_their_order(): void
    {
        $sleep = SunnahCategory::factory()->create(['slug' => 'sleep', 'name' => 'سنن النوم', 'sort_order' => 2]);
        $eating = SunnahCategory::factory()->create(['slug' => 'eating', 'name' => 'سنن الطعام', 'icon' => 'utensils', 'color' => 'amber', 'sort_order' => 1]);
        Sunnah::factory()->for($eating, 'category')->create(['title' => 'الحمد بعد الطعام', 'sort_order' => 2]);
        Sunnah::factory()->for($eating, 'category')->fromHadith('bukhari', 5376)->create(['title' => 'التسمية قبل الطعام', 'sort_order' => 1]);
        Sunnah::factory()->for($sleep, 'category')->create(['title' => 'الوضوء قبل النوم']);

        foreach ([User::factory()->student()->create(), User::factory()->teacher()->create(), User::factory()->admin()->create()] as $user) {
            $this->actingAs($user)
                ->get(route('sunnahs.index'))
                ->assertOk()
                ->assertInertia(fn (AssertableInertia $page) => $page
                    ->component('sunnahs/index')
                    ->has('categories', 2)
                    ->where('categories.0.slug', 'eating')
                    ->where('categories.0.icon', 'utensils')
                    ->where('categories.0.color', 'amber')
                    ->has('categories.0.sunnahs', 2)
                    ->where('categories.0.sunnahs.0.title', 'التسمية قبل الطعام')
                    ->where('categories.0.sunnahs.0.hadith', ['collection' => 'bukhari', 'number' => 5376])
                    ->where('categories.0.sunnahs.1.hadith', null)
                    ->where('categories.1.slug', 'sleep')
                    ->has('categories.1.sunnahs', 1));
        }
    }

    public function test_guests_are_sent_to_the_login_page(): void
    {
        $this->get(route('sunnahs.index'))->assertRedirect(route('login'));
    }

    public function test_the_seeder_installs_the_sunnahs_of_the_platform_and_refreshes_them(): void
    {
        (new SunnahSeeder)->run();
        // Running it again changes nothing.
        (new SunnahSeeder)->run();

        $file = json_decode(File::get(database_path('data/sunnahs.json')), true);
        $this->assertSame(count($file), SunnahCategory::query()->count());
        $this->assertSame(array_sum(array_map(fn (array $category): int => count($category['items']), $file)), Sunnah::query()->count());
        $this->assertGreaterThan(50, Sunnah::query()->count());

        $first = SunnahCategory::query()->ordered()->with('sunnahs')->first();
        $this->assertSame($file[0]['slug'], $first->slug);
        $this->assertSame($file[0]['items'][0]['title'], $first->sunnahs->first()->title);
        $this->assertSame($file[0]['items'][0]['hadith']['collection'], $first->sunnahs->first()->hadith_collection);
        $this->assertNotEmpty($first->sunnahs->first()->evidence);
        $this->assertNotEmpty($first->sunnahs->first()->source);
    }
}
