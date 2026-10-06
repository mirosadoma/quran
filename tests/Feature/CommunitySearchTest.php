<?php

namespace Tests\Feature;

use App\Models\CommunityPost;
use App\Models\CommunityReply;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class CommunitySearchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    /**
     * The ids of the questions a member finds with a search, in the order they are listed.
     *
     * @return list<int>
     */
    protected function idsFoundFor(string $search): array
    {
        $response = $this->actingAs(User::factory()->student()->create())->get(route('community.index', ['search' => $search]));

        return array_column($response->inertiaProps('posts.data'), 'id');
    }

    public function test_a_question_is_found_by_a_word_of_its_title_its_details_or_one_of_its_replies(): void
    {
        $byTitle = CommunityPost::factory()->create(['title' => 'ما هي نواقض الوضوء؟']);
        $byDetails = CommunityPost::factory()->create(['title' => 'سؤال عن الطهارة', 'body' => 'هل ينتقض الوضوء بالنوم الخفيف؟']);
        $byReply = CommunityPost::factory()->create(['title' => 'فاتتني صلاة الفجر', 'body' => 'استيقظت بعد طلوع الشمس.']);
        CommunityReply::factory()->answer()->for($byReply, 'post')->create(['body' => 'قم فور استيقاظك وجدّد الوضوء ثم صلِّ.']);
        CommunityPost::factory()->create(['title' => 'كيف أراجع حفظي؟', 'body' => 'أنسى بسرعة.']);

        $this->assertSame([$byTitle->id, $byDetails->id, $byReply->id], $this->idsFoundFor('الوضوء'));
    }

    public function test_diacritics_tatweel_letter_forms_and_digits_do_not_matter(): void
    {
        $congregation = CommunityPost::factory()->create(['title' => 'مَا حُكْمُ صَلَاةِ الجَمَاعَةِ؟']);
        $reading = CommunityPost::factory()->create(['title' => 'سؤال عن التلاوة', 'body' => 'هل يجوز أن أقرأ القرآن وأنا مستلقٍ؟']);
        $hospital = CommunityPost::factory()->create(['title' => 'الدعاء للمريض في المستشفى']);
        $fasting = CommunityPost::factory()->create(['title' => 'فضل الصــيام في شوال']);
        $inheritance = CommunityPost::factory()->create(['title' => 'سؤال عن مسالة في الميراث']);
        $missedDays = CommunityPost::factory()->create(['title' => 'كيف أقضي 30 يومًا فاتتني؟']);

        $this->assertSame([$congregation->id], $this->idsFoundFor('جماعه'));
        $this->assertSame([$reading->id], $this->idsFoundFor('اقرا'));
        $this->assertSame([$hospital->id], $this->idsFoundFor('مستشفي'));
        $this->assertSame([$fasting->id], $this->idsFoundFor('الصِّيَامِ'));
        $this->assertSame([$inheritance->id], $this->idsFoundFor('مسألة'));
        $this->assertSame([$missedDays->id], $this->idsFoundFor('٣٠'));
    }

    public function test_questions_matching_more_words_and_the_whole_phrase_come_first(): void
    {
        $phrase = CommunityPost::factory()->create(['title' => 'هل صلاة الجماعة في المسجد واجبة؟', 'created_at' => now()->subDays(3)]);
        $twoWords = CommunityPost::factory()->create(['title' => 'فضل الجماعة في صلاة الفجر', 'created_at' => now()->subDays(2)]);
        $inDetails = CommunityPost::factory()->create(['title' => 'سؤال عن الطهارة', 'body' => 'هل أصلي في المسجد إذا كنت مريضًا؟', 'created_at' => now()->subDay()]);
        $oneWord = CommunityPost::factory()->create(['title' => 'صلاة الضحى', 'created_at' => now()]);
        CommunityPost::factory()->create(['title' => 'كيف أراجع حفظي؟']);

        $this->assertSame([$phrase->id, $twoWords->id, $oneWord->id, $inDetails->id], $this->idsFoundFor('صلاة الجماعة في المسجد'));
    }

    public function test_equal_matches_list_the_newest_question_first(): void
    {
        $older = CommunityPost::factory()->create(['title' => 'حكم الأذان للمنفرد', 'created_at' => now()->subDays(2)]);
        $newer = CommunityPost::factory()->create(['title' => 'متى يكون الأذان؟', 'created_at' => now()->subDay()]);

        $this->assertSame([$newer->id, $older->id], $this->idsFoundFor('الأذان'));
    }

    public function test_common_words_alone_do_not_make_a_question_match(): void
    {
        $fajr = CommunityPost::factory()->create(['title' => 'ما حكم تأخير صلاة الفجر؟']);
        CommunityPost::factory()->create(['title' => 'ما حكم الغناء؟']);

        $this->assertSame([$fajr->id], $this->idsFoundFor('ما حكم صلاة الفجر؟'));
    }

    public function test_a_search_made_only_of_common_words_still_looks_for_them(): void
    {
        $how = CommunityPost::factory()->create(['title' => 'كيف أتوب من الغيبة؟']);
        CommunityPost::factory()->create(['title' => 'هل يجوز الصيام في السفر؟']);

        $this->assertSame([$how->id], $this->idsFoundFor('كيف'));
    }

    public function test_a_search_without_letters_lists_every_question(): void
    {
        $older = CommunityPost::factory()->create(['created_at' => now()->subDay()]);
        $newer = CommunityPost::factory()->create();

        $this->assertSame([$newer->id, $older->id], $this->idsFoundFor('% _ ؟'));
    }

    public function test_a_search_keeps_to_the_chosen_filter(): void
    {
        CommunityPost::factory()->answered()->create(['title' => 'صيام الست من شوال']);
        $waiting = CommunityPost::factory()->create(['title' => 'هل يجوز صيام يوم السبت؟']);

        $this->actingAs(User::factory()->student()->create())
            ->get(route('community.index', ['search' => 'صيام', 'filter' => 'unanswered']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('posts.data', 1)
                ->where('posts.data.0.id', $waiting->id));
    }

    public function test_the_searched_words_are_given_to_highlight_them(): void
    {
        $this->actingAs(User::factory()->student()->create())
            ->get(route('community.index', ['search' => 'ما حكم صلاة الجماعة؟']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('filters.search', 'ما حكم صلاة الجماعة؟')
                ->where('highlight', ['صلاه', 'جماعه']));
    }

    public function test_questions_sharing_two_words_with_the_one_being_written_are_suggested(): void
    {
        $answered = CommunityPost::factory()
            ->has(CommunityReply::factory()->accepted(), 'replies')
            ->create(['title' => 'هل يجوز قراءة القرآن من الهاتف بدون وضوء؟']);
        // Only one word in common.
        CommunityPost::factory()->create(['title' => 'فضل تعلم القرآن']);

        $this->actingAs(User::factory()->student()->create())
            ->getJson(route('community.similar', ['q' => 'قراءة القرآن من الجوال']))
            ->assertExactJson(['posts' => [[
                'id' => $answered->id,
                'title' => 'هل يجوز قراءة القرآن من الهاتف بدون وضوء؟',
                'answers_count' => 1,
                'solved' => true,
            ]]]);
    }

    public function test_the_question_page_suggests_questions_sharing_two_words_but_not_itself(): void
    {
        $post = CommunityPost::factory()->create(['title' => 'ما حكم صلاة الجماعة للنساء؟']);
        $similar = CommunityPost::factory()->create(['title' => 'هل صلاة الجماعة واجبة؟']);
        // Only one word in common.
        CommunityPost::factory()->create(['title' => 'صلاة الضحى']);

        $this->actingAs(User::factory()->student()->create())
            ->get(route('community.show', $post))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('similar', 1)
                ->where('similar.0.id', $similar->id));
    }
}
