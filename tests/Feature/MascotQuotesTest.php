<?php

namespace Tests\Feature;

use App\Models\Ayah;
use App\Models\Dhikr;
use App\Models\DhikrCategory;
use App\Models\Saying;
use App\Models\SayingCategory;
use App\Models\User;
use App\Services\MascotQuotes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class MascotQuotesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_every_reference_of_the_data_file_resolves_to_a_text_of_the_platform(): void
    {
        $references = app(MascotQuotes::class)->references();
        $this->seedReferences($references);

        $quotes = app(MascotQuotes::class)->all('ar');

        $expected = count($references['ayahs']) + count($references['hadiths']) + count($references['adhkar']) + count($references['wisdom']);
        $this->assertCount($expected, $quotes);
        $this->assertSame($expected, count(array_unique(array_column($quotes, 'id'))), 'Every quote has its own id.');

        foreach ($quotes as $quote) {
            $this->assertContains($quote['kind'], ['ayah', 'hadith', 'dhikr', 'wisdom']);
            $this->assertNotSame('', trim($quote['text']));
            $this->assertNotSame('', trim($quote['source']), "The quote {$quote['id']} has no source.");
            $this->assertNotNull($quote['href']);
        }
    }

    public function test_ayahs_are_named_by_their_surah_in_the_language_of_the_page_and_open_the_mushaf_there(): void
    {
        Ayah::factory()->create(['surah' => 54, 'ayah' => 17, 'text' => '۞ وَلَقَدْ يَسَّرْنَا ٱلْقُرْءَانَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍۢ']);

        $arabic = collect(app(MascotQuotes::class)->all('ar'))->firstWhere('id', 'ayah:54:17');
        $english = collect(app(MascotQuotes::class)->all('en'))->firstWhere('id', 'ayah:54:17');

        $this->assertSame('وَلَقَدْ يَسَّرْنَا ٱلْقُرْءَانَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍۢ', $arabic['text']);
        $this->assertSame('سورة القمر: 17', $arabic['source']);
        $this->assertSame('Al-Qamar 54:17', $english['source']);
        $this->assertSame(route('mushaf.index', ['surah' => 54, 'ayah' => 17]), $arabic['href']);
    }

    public function test_a_hadith_links_to_its_page_in_the_hadith_books_and_a_saying_names_who_said_it(): void
    {
        $category = SayingCategory::factory()->create();
        Saying::factory()->for($category, 'category')->create([
            'slug' => 'la-yumin-ahadukum',
            'text' => 'لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
            'attribution' => 'النبي ﷺ، رواه أنس بن مالك رضي الله عنه',
            'source' => 'متفق عليه',
            'hadith_collection' => 'bukhari',
            'hadith_number' => 13,
        ]);
        Saying::factory()->for($category, 'category')->create([
            'slug' => 'ali-qimatu-kulli-imri',
            'text' => 'قيمة كل امرئ ما يُحسن.',
            'attribution' => 'علي بن أبي طالب رضي الله عنه',
            'source' => 'جامع بيان العلم وفضله لابن عبد البر',
        ]);

        $quotes = collect(app(MascotQuotes::class)->all('ar'));
        $hadith = $quotes->firstWhere('id', 'hadith:la-yumin-ahadukum');
        $wisdom = $quotes->firstWhere('id', 'wisdom:ali-qimatu-kulli-imri');

        $this->assertSame('hadith', $hadith['kind']);
        $this->assertSame('متفق عليه', $hadith['source']);
        $this->assertSame(route('hadith.hadith', ['collection' => 'bukhari', 'number' => 13]), $hadith['href']);
        $this->assertSame('wisdom', $wisdom['kind']);
        $this->assertSame('علي بن أبي طالب رضي الله عنه، جامع بيان العلم وفضله لابن عبد البر', $wisdom['source']);
        $this->assertSame(route('sayings.index'), $wisdom['href']);
    }

    public function test_a_dhikr_hidden_by_the_admin_is_not_shown(): void
    {
        $tasbih = DhikrCategory::factory()->create(['slug' => 'tasbih']);
        Dhikr::factory()->for($tasbih, 'category')->create(['sort_order' => 1, 'text' => 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', 'reference' => 'رواه مسلم']);
        Dhikr::factory()->for($tasbih, 'category')->inactive()->create(['sort_order' => 2]);

        $quotes = collect(app(MascotQuotes::class)->all('ar'))->where('kind', 'dhikr');

        $this->assertCount(1, $quotes);
        $this->assertSame('dhikr:tasbih:1', $quotes->first()['id']);
        $this->assertSame('رواه مسلم', $quotes->first()['source']);
        $this->assertSame(route('adhkar.index'), $quotes->first()['href']);
    }

    public function test_the_quotes_are_shared_with_every_page_for_guests_and_users_alike(): void
    {
        Ayah::factory()->create(['surah' => 94, 'ayah' => 6, 'text' => 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًۭا']);

        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('mascot', 1)
                ->where('mascot.0.kind', 'ayah')
                ->where('mascot.0.text', 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًۭا'));

        $this->actingAs(User::factory()->student()->create())
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->has('mascot', 1)->where('mascot.0.id', 'ayah:94:6'));
    }

    /**
     * Create the rows the data file points at (the real tables are installed by the seeders).
     *
     * @param  array{ayahs: list<array{surah: int, ayah: int}>, hadiths: list<string>, adhkar: list<array{category: string, order: int}>, wisdom: list<string>}  $references
     */
    protected function seedReferences(array $references): void
    {
        foreach ($references['ayahs'] as $reference) {
            Ayah::factory()->create(['surah' => $reference['surah'], 'ayah' => $reference['ayah']]);
        }

        $category = SayingCategory::factory()->create();

        foreach ([...$references['hadiths'], ...$references['wisdom']] as $slug) {
            Saying::factory()->for($category, 'category')->create(['slug' => $slug, 'source' => 'رواه مسلم']);
        }

        $categories = [];

        foreach ($references['adhkar'] as $reference) {
            $categories[$reference['category']] ??= DhikrCategory::factory()->create(['slug' => $reference['category']]);
            Dhikr::factory()->for($categories[$reference['category']], 'category')->create(['sort_order' => $reference['order']]);
        }
    }
}
