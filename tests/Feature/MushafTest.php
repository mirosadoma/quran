<?php

namespace Tests\Feature;

use App\Enums\HighlightColor;
use App\Enums\TafsirEdition;
use App\Models\Ayah;
use App\Models\MushafBookmark;
use App\Models\MushafHighlight;
use App\Models\Reciter;
use App\Models\Tafsir;
use App\Models\User;
use App\Models\WordMeaning;
use App\Services\Mushaf;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class MushafTest extends TestCase
{
    use RefreshDatabase;

    protected User $student;

    protected function setUp(): void
    {
        parent::setUp();

        $this->student = User::factory()->student()->create();

        Ayah::factory()->create(['id' => 1, 'surah' => 1, 'ayah' => 1, 'page' => 1, 'text' => 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ', 'text_search' => Mushaf::normalize('بسم الله الرحمن الرحيم')]);
        Ayah::factory()->create(['id' => 2, 'surah' => 1, 'ayah' => 2, 'page' => 1, 'text' => 'ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ', 'text_search' => Mushaf::normalize('الحمد لله رب العالمين')]);
        Ayah::factory()->create(['id' => 262, 'surah' => 2, 'ayah' => 255, 'page' => 42, 'juz' => 3, 'hizb_quarter' => 17, 'text' => 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ ٱلْحَىُّ ٱلْقَيُّومُ', 'text_search' => Mushaf::normalize('الله لا إله إلا هو الحي القيوم')]);
    }

    public function test_the_reader_opens_at_the_requested_ayah_with_the_reciters(): void
    {
        Reciter::factory()->create(['name' => 'محمود خليل الحصري']);

        $this->actingAs($this->student)
            ->get(route('mushaf.index', ['surah' => 2, 'ayah' => 255]))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('mushaf/index')
                ->where('initialPage', 42)
                ->where('focusAyahId', 262)
                ->where('ready', true)
                ->has('reciters', 1)
                ->where('reciters.0.audio_url', 'https://everyayah.com/data/Husary_128kbps/')
                ->has('tafsirs', 2));
    }

    public function test_the_reader_reopens_the_last_page_read(): void
    {
        $this->actingAs($this->student)->put(route('mushaf.position'), ['page' => 42])->assertNoContent();

        $this->assertSame(42, $this->student->fresh()->mushaf_page);

        $this->actingAs($this->student)
            ->get(route('mushaf.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('initialPage', 42));
    }

    public function test_a_page_returns_its_ayahs_in_order(): void
    {
        $this->actingAs($this->student)
            ->getJson(route('mushaf.page', 1))
            ->assertOk()
            ->assertJsonCount(2, 'ayahs')
            ->assertJsonPath('ayahs.0.id', 1)
            ->assertJsonPath('ayahs.1.ayah', 2);

        $this->actingAs($this->student)->getJson(route('mushaf.page', 605))->assertNotFound();
    }

    public function test_tafsir_of_an_ayah_in_the_chosen_book(): void
    {
        Tafsir::factory()->create(['ayah_id' => 262, 'edition' => TafsirEdition::Muyassar, 'text' => 'هو الله المتفرد بالألوهية']);
        Tafsir::factory()->create(['ayah_id' => 262, 'edition' => TafsirEdition::Jalalayn, 'text' => 'لا معبود بحق في الوجود إلا هو']);

        $this->actingAs($this->student)
            ->getJson(route('mushaf.tafsir', ['ayah' => 262, 'edition' => 'jalalayn']))
            ->assertOk()
            ->assertJsonPath('edition', 'jalalayn')
            ->assertJsonPath('text', 'لا معبود بحق في الوجود إلا هو')
            ->assertJsonPath('ayah.page', 42);
    }

    public function test_search_ignores_diacritics_and_accepts_a_reference(): void
    {
        $this->actingAs($this->student)
            ->getJson(route('mushaf.search', ['q' => 'الحَمدُ لِلّه']))
            ->assertOk()
            ->assertJsonCount(1, 'results')
            ->assertJsonPath('results.0.id', 2);

        $this->actingAs($this->student)
            ->getJson(route('mushaf.search', ['q' => '2:255']))
            ->assertJsonPath('results.0.page', 42);
    }

    public function test_bookmarks_are_personal(): void
    {
        $this->actingAs($this->student)
            ->postJson(route('mushaf.bookmarks.store'), ['page' => 1, 'ayah_id' => 262])
            ->assertCreated()
            ->assertJsonPath('bookmark.page', 42)
            ->assertJsonPath('bookmark.ayah', 255);

        $bookmark = MushafBookmark::query()->sole();
        $other = User::factory()->student()->create();

        $this->actingAs($other)->deleteJson(route('mushaf.bookmarks.destroy', $bookmark))->assertForbidden();
        $this->actingAs($this->student)->deleteJson(route('mushaf.bookmarks.destroy', $bookmark))->assertNoContent();

        $this->assertModelMissing($bookmark);
    }

    public function test_an_ayah_can_be_marked_changed_and_unmarked(): void
    {
        $this->actingAs($this->student)
            ->putJson(route('mushaf.highlights.update', 262), ['color' => 'gold', 'note' => 'أراجعها يوميًا'])
            ->assertOk()
            ->assertJsonPath('highlight.color', 'gold');

        $this->actingAs($this->student)
            ->putJson(route('mushaf.highlights.update', 262), ['color' => 'sky'])
            ->assertOk();

        $this->assertSame(1, MushafHighlight::query()->count());
        $this->assertSame(HighlightColor::Sky, MushafHighlight::query()->sole()->color);

        $this->actingAs($this->student)->putJson(route('mushaf.highlights.update', 262), ['color' => 'black'])->assertUnprocessable();
        $this->actingAs($this->student)->deleteJson(route('mushaf.highlights.destroy', 262))->assertNoContent();

        $this->assertSame(0, MushafHighlight::query()->count());
    }

    public function test_a_page_gives_the_plain_text_and_the_word_meanings(): void
    {
        Ayah::query()->whereKey(262)->update(['text_simple' => 'الله لا إله إلا هو الحي القيوم']);
        WordMeaning::factory()->create(['ayah_id' => 262, 'position' => 6, 'word' => 'ٱلْقَيُّومُ', 'meaning' => 'المبالغ في القيام بتدبير خلقه', 'source' => WordMeaning::JALALAYN]);
        // An empty meaning hides the word's meaning.
        WordMeaning::factory()->create(['ayah_id' => 262, 'position' => 5, 'word' => 'ٱلْحَىُّ', 'meaning' => '', 'source' => WordMeaning::MANUAL]);

        $this->actingAs($this->student)
            ->getJson(route('mushaf.page', 42))
            ->assertOk()
            ->assertJsonPath('ayahs.0.simple', 'الله لا إله إلا هو الحي القيوم')
            ->assertJsonPath('ayahs.0.meanings', ['6' => 'المبالغ في القيام بتدبير خلقه']);
    }

    public function test_a_surah_is_given_ayah_by_ayah_for_memorizing(): void
    {
        $this->actingAs($this->student)
            ->getJson(route('mushaf.surah', 1))
            ->assertOk()
            ->assertJsonPath('surah', 1)
            ->assertJsonCount(2, 'ayahs')
            ->assertJsonPath('ayahs.1.ayah', 2)
            ->assertJsonPath('ayahs.1.page', 1)
            ->assertJsonStructure(['ayahs' => [['id', 'ayah', 'page', 'text', 'simple']]]);

        $this->actingAs($this->student)->getJson(route('mushaf.surah', 115))->assertNotFound();
    }

    public function test_only_the_administration_edits_word_meanings(): void
    {
        WordMeaning::factory()->create(['ayah_id' => 262, 'position' => 6, 'word' => 'ٱلْقَيُّومُ', 'meaning' => 'معنى قديم', 'source' => WordMeaning::JALALAYN]);
        $meanings = ['meanings' => [['position' => 1, 'meaning' => 'نافية للجنس'], ['position' => 6, 'meaning' => '']]];

        $this->actingAs($this->student)->putJson(route('mushaf.meanings.update', 262), $meanings)->assertForbidden();

        $this->actingAs(User::factory()->admin()->create())
            ->putJson(route('mushaf.meanings.update', 262), $meanings)
            ->assertOk()
            ->assertJsonPath('meanings', ['1' => 'نافية للجنس']);

        $this->assertSame(WordMeaning::MANUAL, WordMeaning::query()->where('ayah_id', 262)->where('position', 6)->value('source'));

        $this->actingAs(User::factory()->admin()->create())
            ->putJson(route('mushaf.meanings.update', 262), ['meanings' => [['position' => 9, 'meaning' => 'خارج الآية']]])
            ->assertJsonValidationErrors('meanings.0.position');
    }
}
