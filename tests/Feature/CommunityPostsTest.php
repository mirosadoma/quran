<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CommunityPost;
use App\Models\CommunityReply;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CommunityPostsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    /**
     * @return array<string, array{UserRole}>
     */
    public static function roles(): array
    {
        return collect(UserRole::cases())->mapWithKeys(fn (UserRole $role): array => [$role->value => [$role]])->all();
    }

    public function test_guests_are_sent_to_the_login_page(): void
    {
        $post = CommunityPost::factory()->create();

        $this->get(route('community.index'))->assertRedirect(route('login'));
        $this->get(route('community.show', $post))->assertRedirect(route('login'));
        $this->post(route('community.store'), ['title' => 'سؤال', 'body' => 'تفاصيل'])->assertRedirect(route('login'));
        $this->post(route('community.replies.store', $post), ['body' => 'تعليق'])->assertRedirect(route('login'));

        $this->assertSame(1, CommunityPost::query()->count());
        $this->assertSame(0, CommunityReply::query()->count());
    }

    #[DataProvider('roles')]
    public function test_every_role_can_ask_a_question(UserRole $role): void
    {
        $member = User::factory()->{$role->value}()->create();

        $response = $this->actingAs($member)->post(route('community.store'), [
            'title' => 'ما حكم صلاة الجماعة للرجال؟',
            'body' => 'أصلي أحيانًا في البيت، فهل يلزمني الذهاب إلى المسجد؟',
        ]);

        $post = CommunityPost::query()->sole();
        $response->assertRedirect(route('community.show', $post));
        $this->assertTrue($post->author->is($member));
        $this->assertSame('ما حكم صلاة الجماعة للرجال؟', $post->title);
        $this->assertSame('أصلي أحيانًا في البيت، فهل يلزمني الذهاب إلى المسجد؟', $post->body);
        $this->assertNull($post->edited_at);
    }

    public function test_a_question_needs_a_title_and_its_details(): void
    {
        $this->actingAs(User::factory()->student()->create())
            ->post(route('community.store'), ['title' => '', 'body' => ''])
            ->assertSessionHasErrors(['title' => 'السؤال مطلوب.', 'body' => 'شرح السؤال مطلوب.']);

        $this->assertSame(0, CommunityPost::query()->count());
    }

    public function test_a_question_has_a_title_of_200_characters_and_details_of_5000_at_most(): void
    {
        $this->actingAs(User::factory()->student()->create())
            ->post(route('community.store'), ['title' => str_repeat('س', 201), 'body' => str_repeat('ت', 5001)])
            ->assertSessionHasErrors([
                'title' => 'يجب ألا يتجاوز طول السؤال 200 حرفاً.',
                'body' => 'يجب ألا يتجاوز طول شرح السؤال 5000 حرفاً.',
            ]);

        $this->assertSame(0, CommunityPost::query()->count());
    }

    public function test_the_author_edits_their_question_and_it_shows_as_edited(): void
    {
        $post = CommunityPost::factory()->create(['title' => 'سؤال قبل التعديل']);

        $this->actingAs($post->author)
            ->put(route('community.update', $post), ['title' => 'سؤال بعد التعديل', 'body' => 'تفاصيل أوضح للسؤال'])
            ->assertRedirect();

        $post->refresh();
        $this->assertSame('سؤال بعد التعديل', $post->title);
        $this->assertSame('تفاصيل أوضح للسؤال', $post->body);
        $this->assertNotNull($post->edited_at);
    }

    public function test_members_cannot_change_or_delete_the_questions_of_others(): void
    {
        $post = CommunityPost::factory()->create(['title' => 'سؤال طالب']);
        $changes = ['title' => 'تغيير', 'body' => 'تغيير'];

        foreach ([User::factory()->student()->create(), User::factory()->teacher()->create(), User::factory()->manager()->create()] as $member) {
            $this->actingAs($member)->put(route('community.update', $post), $changes)->assertForbidden();
            $this->actingAs($member)->delete(route('community.destroy', $post))->assertForbidden();
        }

        $this->assertSame('سؤال طالب', $post->fresh()->title);
    }

    public function test_the_author_deletes_their_question_with_its_replies(): void
    {
        $post = CommunityPost::factory()->answered()->create();
        $comment = CommunityReply::factory()->for($post, 'post')->create();

        $this->actingAs($post->author)->delete(route('community.destroy', $post))->assertRedirect(route('community.index'));

        $this->assertModelMissing($post);
        $this->assertModelMissing($comment);
        $this->assertSame(0, CommunityReply::query()->count());
    }

    public function test_the_administration_deletes_any_question_but_does_not_edit_it(): void
    {
        $post = CommunityPost::factory()->create(['title' => 'سؤال طالب']);
        $admin = User::factory()->admin()->create();

        $this->actingAs($admin)->put(route('community.update', $post), ['title' => 'تغيير', 'body' => 'تغيير'])->assertForbidden();
        $this->assertSame('سؤال طالب', $post->fresh()->title);

        $this->actingAs($admin)->delete(route('community.destroy', $post))->assertRedirect(route('community.index'));
        $this->assertModelMissing($post);
    }

    public function test_the_list_shows_the_newest_questions_first_with_their_answers_and_comments(): void
    {
        $older = CommunityPost::factory()->create(['created_at' => now()->subDays(2)]);
        CommunityReply::factory()->answer()->for($older, 'post')->create();
        CommunityReply::factory()->count(2)->for($older, 'post')->create();
        $newer = CommunityPost::factory()->create(['created_at' => now()->subHour()]);

        $this->actingAs(User::factory()->teacher()->create())
            ->get(route('community.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('community/index')
                ->where('posts.data.0.id', $newer->id)
                ->where('posts.data.0.answers_count', 0)
                ->where('posts.data.1.id', $older->id)
                ->where('posts.data.1.answers_count', 1)
                ->where('posts.data.1.comments_count', 2)
                ->where('posts.data.1.author.role', 'student')
                ->missing('posts.data.1.author.email')
                ->missing('posts.data.1.author.phone')
                ->where('counts', ['all' => 2, 'unanswered' => 1, 'mine' => 0]));
    }

    public function test_the_unanswered_filter_keeps_the_questions_no_sheikh_answered(): void
    {
        CommunityPost::factory()->answered()->create();
        $commented = CommunityPost::factory()->has(CommunityReply::factory(), 'replies')->create();
        $waiting = CommunityPost::factory()->create();

        $this->actingAs(User::factory()->teacher()->create())
            ->get(route('community.index', ['filter' => 'unanswered']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('filters.filter', 'unanswered')
                ->has('posts.data', 2)
                ->where('posts.data.0.id', $waiting->id)
                ->where('posts.data.1.id', $commented->id));
    }

    public function test_the_my_questions_filter_keeps_the_questions_of_the_member(): void
    {
        $student = User::factory()->student()->create();
        $mine = CommunityPost::factory()->for($student, 'author')->create();
        CommunityPost::factory()->create();

        $this->actingAs($student)
            ->get(route('community.index', ['filter' => 'mine']))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('posts.data', 1)
                ->where('posts.data.0.id', $mine->id)
                ->where('counts.mine', 1));
    }

    public function test_the_question_page_tells_who_may_change_the_question_and_whose_replies_are_answers(): void
    {
        $post = CommunityPost::factory()->create(['title' => 'كيف أحافظ على وردي اليومي؟']);

        $this->actingAs($post->author)
            ->get(route('community.show', $post))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('community/show')
                ->where('post.title', 'كيف أحافظ على وردي اليومي؟')
                ->where('post.can', ['update' => true, 'delete' => true])
                ->where('can.answer', false));

        $this->actingAs(User::factory()->teacher()->create())
            ->get(route('community.show', $post))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('post.can', ['update' => false, 'delete' => false])
                ->where('can.answer', true));
    }
}
