<?php

namespace Tests\Feature;

use App\Models\Hadith;
use App\Models\HadithBook;
use App\Models\HadithCollection;
use App\Models\User;
use Database\Seeders\HadithSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class HadithTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_every_user_sees_the_collections_with_their_counts_and_the_hadith_of_the_day(): void
    {
        $bukhari = HadithCollection::factory()->create(['slug' => 'bukhari', 'name' => 'صحيح البخاري', 'sort_order' => 1]);
        $riyad = HadithCollection::factory()->create(['slug' => 'riyad-as-salihin', 'sort_order' => 2]);
        $book = HadithBook::factory()->for($bukhari, 'collection')->create(['number' => 1, 'name' => 'كتاب بدء الوحي']);
        Hadith::factory()->count(2)->for($bukhari, 'collection')->for($book, 'book')->create();
        Hadith::factory()->for($riyad, 'collection')->create(['number' => 1, 'text' => 'الدِّينُ النَّصِيحَةُ']);

        foreach ([User::factory()->student()->create(), User::factory()->teacher()->create(), User::factory()->admin()->create()] as $user) {
            $this->actingAs($user)
                ->get(route('hadith.index'))
                ->assertOk()
                ->assertInertia(fn (AssertableInertia $page) => $page
                    ->component('hadith/index')
                    ->has('collections', 2)
                    ->where('collections.0.slug', 'bukhari')
                    ->where('collections.0.name', 'صحيح البخاري')
                    ->where('collections.0.books_count', 1)
                    ->where('collections.0.hadiths_count', 2)
                    ->where('collections.1.hadiths_count', 1)
                    ->where('filters', ['search' => '', 'collection' => null])
                    ->where('highlight', [])
                    ->where('results', null)
                    ->where('daily.text', 'الدِّينُ النَّصِيحَةُ')
                    ->where('daily.collection.slug', 'riyad-as-salihin'));
        }
    }

    public function test_a_search_finds_the_hadiths_holding_every_word_whatever_their_diacritics(): void
    {
        $bukhari = HadithCollection::factory()->create(['slug' => 'bukhari']);
        $muslim = HadithCollection::factory()->create(['slug' => 'muslim']);
        Hadith::factory()->for($bukhari, 'collection')->create(['number' => 1, 'text' => 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ']);
        Hadith::factory()->for($muslim, 'collection')->create(['number' => 55, 'text' => 'الدِّينُ النَّصِيحَةُ']);
        Hadith::factory()->for($muslim, 'collection')->create(['number' => 56, 'text' => 'إنما الأعمال بالنيات وإنما لكل امرئ ما نوى']);
        $user = User::factory()->student()->create();

        $this->actingAs($user)
            ->get(route('hadith.index', ['search' => 'الاعمال بالنيات']))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('filters.search', 'الاعمال بالنيات')
                ->where('highlight', ['الاعمال', 'بالنيات'])
                ->where('results.total', 2)
                ->where('results.data.0.number', 1)
                ->where('results.data.0.collection.slug', 'bukhari')
                ->where('results.data.1.number', 56)
                ->where('results.data.1.collection.slug', 'muslim')
                ->where('daily', null));

        // Inside one collection only.
        $this->actingAs($user)
            ->get(route('hadith.index', ['search' => 'الأعمال', 'collection' => 'muslim']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('filters.collection', 'muslim')
                ->where('results.total', 1)
                ->where('results.data.0.number', 56));

        // A blank search shows the collections.
        $this->actingAs($user)
            ->get(route('hadith.index', ['search' => '   ']))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('results', null)->where('highlight', []));
    }

    public function test_a_collection_opens_on_its_first_book_and_shows_the_hadiths_of_the_chosen_book(): void
    {
        $collection = HadithCollection::factory()->create(['slug' => 'bukhari']);
        $faith = HadithBook::factory()->for($collection, 'collection')->create(['number' => 2, 'name' => 'كتاب الإيمان']);
        $revelation = HadithBook::factory()->for($collection, 'collection')->create(['number' => 1, 'name' => 'كتاب بدء الوحي']);
        Hadith::factory()->for($collection, 'collection')->for($revelation, 'book')->create(['number' => 1]);
        Hadith::factory()->for($collection, 'collection')->for($faith, 'book')->create(['number' => 8, 'grade' => 'صحيح', 'grader' => 'الألباني']);
        Hadith::factory()->for($collection, 'collection')->for($faith, 'book')->create(['number' => 9, 'part' => 2]);
        $user = User::factory()->student()->create();

        $this->actingAs($user)
            ->get(route('hadith.show', 'bukhari'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('hadith/show')
                ->where('collection.slug', 'bukhari')
                ->where('collection.books_count', 2)
                ->where('collection.hadiths_count', 3)
                ->has('books', 2)
                ->where('books.0.number', 1)
                ->where('books.0.hadiths_count', 1)
                ->where('books.1.hadiths_count', 2)
                ->where('book.number', 1)
                ->where('filters', ['search' => '', 'book' => 1])
                ->has('hadiths.data', 1)
                ->where('hadiths.data.0.number', 1)
                ->where('hadiths.data.0.book.name', 'كتاب بدء الوحي'));

        $this->actingAs($user)
            ->get(route('hadith.show', ['collection' => 'bukhari', 'book' => 2]))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('book.name', 'كتاب الإيمان')
                ->has('hadiths.data', 2)
                ->where('hadiths.data.0.label', '8')
                ->where('hadiths.data.0.grade', 'صحيح')
                ->where('hadiths.data.0.grader', 'الألباني')
                ->where('hadiths.data.1.label', '9.2'));

        $this->actingAs($user)->get(route('hadith.show', ['collection' => 'bukhari', 'book' => 9]))->assertNotFound();
        $this->actingAs($user)->get(route('hadith.show', 'unknown'))->assertNotFound();
    }

    public function test_a_search_inside_a_collection_looks_through_all_its_books(): void
    {
        $collection = HadithCollection::factory()->create(['slug' => 'muslim']);
        $first = HadithBook::factory()->for($collection, 'collection')->create(['number' => 1]);
        $second = HadithBook::factory()->for($collection, 'collection')->create(['number' => 2]);
        Hadith::factory()->for($collection, 'collection')->for($first, 'book')->create(['number' => 1, 'text' => 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ']);
        Hadith::factory()->for($collection, 'collection')->for($second, 'book')->create(['number' => 95, 'text' => 'الدِّينُ النَّصِيحَةُ']);
        Hadith::factory()->for(HadithCollection::factory(), 'collection')->create(['number' => 95, 'text' => 'الدين النصيحة']);
        $user = User::factory()->student()->create();

        $this->actingAs($user)
            ->get(route('hadith.show', ['collection' => 'muslim', 'search' => 'النصيحة']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('book', null)
                ->where('filters', ['search' => 'النصيحة', 'book' => null])
                ->where('highlight', ['النصيحه'])
                ->has('hadiths.data', 1)
                ->where('hadiths.data.0.number', 95)
                ->where('hadiths.data.0.book.number', 2));

        // Inside one book of it.
        $this->actingAs($user)
            ->get(route('hadith.show', ['collection' => 'muslim', 'search' => 'النصيحة', 'book' => 1]))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('book.number', 1)->has('hadiths.data', 0));
    }

    public function test_a_hadith_opens_by_its_number_with_all_its_parts_and_its_neighbours(): void
    {
        $collection = HadithCollection::factory()->create(['slug' => 'bukhari']);
        $book = HadithBook::factory()->for($collection, 'collection')->create(['number' => 1, 'name' => 'كتاب بدء الوحي']);
        Hadith::factory()->for($collection, 'collection')->for($book, 'book')->create(['number' => 1]);
        Hadith::factory()->for($collection, 'collection')->for($book, 'book')->create(['number' => 2, 'text' => 'الجزء الأول']);
        Hadith::factory()->for($collection, 'collection')->for($book, 'book')->create(['number' => 2, 'part' => 2, 'text' => 'الجزء الثاني']);
        Hadith::factory()->for($collection, 'collection')->for($book, 'book')->create(['number' => 5]);
        Hadith::factory()->for(HadithCollection::factory(), 'collection')->create(['number' => 3]);
        $user = User::factory()->student()->create();

        $this->actingAs($user)
            ->get(route('hadith.hadith', ['collection' => 'bukhari', 'number' => 2]))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('hadith/hadith')
                ->where('collection.slug', 'bukhari')
                ->has('hadiths', 2)
                ->where('hadiths.0.label', '2')
                ->where('hadiths.0.text', 'الجزء الأول')
                ->where('hadiths.0.book.name', 'كتاب بدء الوحي')
                ->where('hadiths.1.label', '2.2')
                ->where('previous', 1)
                ->where('next', 5));

        $this->actingAs($user)
            ->get(route('hadith.hadith', ['collection' => 'bukhari', 'number' => 1]))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('previous', null)->where('next', 2));

        $this->actingAs($user)->get(route('hadith.hadith', ['collection' => 'bukhari', 'number' => 3]))->assertNotFound();
    }

    public function test_guests_are_sent_to_the_login_page(): void
    {
        HadithCollection::factory()->create(['slug' => 'bukhari']);

        $this->get(route('hadith.index'))->assertRedirect(route('login'));
        $this->get(route('hadith.show', 'bukhari'))->assertRedirect(route('login'));
        $this->get(route('hadith.hadith', ['collection' => 'bukhari', 'number' => 1]))->assertRedirect(route('login'));
    }

    public function test_the_seeder_installs_the_collections_from_their_files_and_refreshes_them(): void
    {
        $path = storage_path('framework/testing/hadith-'.Str::lower(Str::random(10)));
        File::ensureDirectoryExists($path);
        File::copy(database_path('data/hadith/nawawi-40.json'), "{$path}/nawawi-40.json");
        File::put("{$path}/qudsi-40.json", (string) json_encode([
            'books' => [['number' => 1, 'name' => 'الحديث القدسي', 'name_en' => 'Forty Hadith Qudsi']],
            'hadiths' => [
                ['number' => 1, 'part' => 1, 'book' => 1, 'text' => 'قَالَ اللَّهُ تَعَالَى', 'grade' => null, 'grader' => null],
                ['number' => 1, 'part' => 2, 'book' => null, 'text' => 'تكملة الحديث', 'grade' => 'صحيح', 'grader' => 'الألباني'],
            ],
        ], JSON_UNESCAPED_UNICODE));

        try {
            (new HadithSeeder($path))->run();
            // Running it again changes nothing.
            (new HadithSeeder($path))->run();
        } finally {
            File::deleteDirectory($path);
        }

        $this->assertSame(['nawawi-40', 'qudsi-40'], HadithCollection::query()->ordered()->pluck('slug')->all());

        $nawawi = HadithCollection::query()->where('slug', 'nawawi-40')->sole();
        $this->assertSame('الأربعون النووية', $nawawi->name);
        $this->assertSame(1, $nawawi->books()->count());
        $this->assertSame(42, $nawawi->hadiths()->count());

        $first = $nawawi->hadiths()->where('number', 1)->sole();
        $this->assertStringContainsString('الْأَعْمَالُ بِالنِّيَّاتِ', $first->text);
        $this->assertStringContainsString('انما الاعمال بالنيات', $first->text_search);
        $this->assertSame('الأربعون النووية', $first->book->name);
        $this->assertNull($first->grade);

        $qudsi = HadithCollection::query()->where('slug', 'qudsi-40')->sole();
        $this->assertSame(2, $qudsi->hadiths()->count());
        $part = $qudsi->hadiths()->where('part', 2)->sole();
        $this->assertSame('صحيح', $part->grade);
        $this->assertSame('الألباني', $part->grader);
        $this->assertNull($part->hadith_book_id);
        $this->assertSame(1, $qudsi->hadiths()->where('part', 1)->sole()->book->number);
    }
}
