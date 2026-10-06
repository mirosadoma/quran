<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\CommunityPost;
use App\Models\CommunityReply;
use App\Models\User;
use App\Notifications\CommunityReplyPosted;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CommunityRepliesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    /**
     * @return array<string, array{UserRole, bool}>
     */
    public static function repliers(): array
    {
        return [
            'a teacher answers' => [UserRole::Teacher, true],
            'a manager answers' => [UserRole::Manager, true],
            'the administration answers' => [UserRole::Admin, true],
            'a student comments' => [UserRole::Student, false],
        ];
    }

    #[DataProvider('repliers')]
    public function test_replies_of_sheikhs_are_answers_and_replies_of_students_are_comments(UserRole $role, bool $isAnswer): void
    {
        $post = CommunityPost::factory()->create();
        $member = User::factory()->{$role->value}()->create();

        $response = $this->actingAs($member)->post(route('community.replies.store', $post), ['body' => 'جزاك الله خيرًا على هذا السؤال المهم.']);

        $reply = CommunityReply::query()->sole();
        $response->assertRedirect(route('community.show', ['post' => $post, 'reply' => $reply->id]));
        $this->assertSame($isAnswer, $reply->is_answer);
        $this->assertTrue($reply->author->is($member));
        $this->assertTrue($reply->post->is($post));
        $this->assertSame('جزاك الله خيرًا على هذا السؤال المهم.', $reply->body);
    }

    public function test_the_member_who_asked_is_notified_of_a_sheikhs_answer(): void
    {
        $post = CommunityPost::factory()->create();
        $sheikh = User::factory()->teacher()->create(['name' => 'الشيخ أحمد']);
        Notification::fake();

        $this->actingAs($sheikh)->post(route('community.replies.store', $post), ['body' => 'نعم يجوز ذلك، والأفضل أن تكون على طهارة.']);

        $reply = CommunityReply::query()->sole();
        Notification::assertSentTo($post->author, CommunityReplyPosted::class, function (CommunityReplyPosted $notification) use ($post, $reply): bool {
            $data = $notification->toArray($post->author);

            return $notification->reply->is($reply)
                && $data['title'] === 'أجاب الشيخ أحمد عن سؤالك'
                && $data['body'] === 'نعم يجوز ذلك، والأفضل أن تكون على طهارة.'
                && $data['url'] === route('community.show', ['post' => $post->id, 'reply' => $reply->id]);
        });
        Notification::assertNotSentTo($sheikh, CommunityReplyPosted::class);
    }

    public function test_the_member_who_asked_is_notified_of_a_comment(): void
    {
        $post = CommunityPost::factory()->create();
        $student = User::factory()->student()->create(['name' => 'مريم علي']);
        Notification::fake();

        $this->actingAs($student)->post(route('community.replies.store', $post), ['body' => 'عندي نفس السؤال.']);

        Notification::assertSentTo($post->author, CommunityReplyPosted::class, fn (CommunityReplyPosted $notification): bool => $notification->toArray($post->author)['title'] === 'علّق مريم علي على سؤالك');
    }

    public function test_the_member_who_asked_is_not_notified_of_their_own_reply(): void
    {
        $post = CommunityPost::factory()->create();
        Notification::fake();

        $this->actingAs($post->author)->post(route('community.replies.store', $post), ['body' => 'أضيف توضيحًا: أقصد صلاة الفجر.'])->assertRedirect();

        Notification::assertNothingSent();
        $this->assertSame(1, CommunityReply::query()->count());
    }

    public function test_a_reply_needs_text_of_5000_characters_at_most(): void
    {
        $post = CommunityPost::factory()->create();
        $sheikh = User::factory()->teacher()->create();

        $this->actingAs($sheikh)->post(route('community.replies.store', $post), ['body' => ''])->assertSessionHasErrors(['body' => 'الرد مطلوب.']);
        $this->actingAs($sheikh)
            ->post(route('community.replies.store', $post), ['body' => str_repeat('ر', 5001)])
            ->assertSessionHasErrors(['body' => 'يجب ألا يتجاوز طول الرد 5000 حرفاً.']);

        $this->assertSame(0, CommunityReply::query()->count());
    }

    public function test_the_question_page_lists_the_accepted_answer_first_then_answers_and_comments_in_order(): void
    {
        $post = CommunityPost::factory()->create();
        $firstAnswer = CommunityReply::factory()->answer()->for($post, 'post')->create(['created_at' => now()->subHours(5)]);
        $firstComment = CommunityReply::factory()->for($post, 'post')->create(['created_at' => now()->subHours(4)]);
        $accepted = CommunityReply::factory()->accepted()->for($post, 'post')->create(['created_at' => now()->subHours(3)]);
        $lastComment = CommunityReply::factory()->for($post, 'post')->create(['created_at' => now()->subHour()]);

        $this->actingAs($post->author)
            ->get(route('community.show', $post))
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('community/show')
                ->has('answers', 2)
                ->where('answers.0.id', $accepted->id)
                ->where('answers.0.is_accepted', true)
                ->where('answers.1.id', $firstAnswer->id)
                ->where('answers.1.can.accept', true)
                ->has('comments', 2)
                ->where('comments.0.id', $firstComment->id)
                ->where('comments.0.can.accept', false)
                ->where('comments.1.id', $lastComment->id)
                ->where('post.answers_count', 2)
                ->where('post.comments_count', 2)
                ->where('post.solved', true)
                ->where('focus', null));
    }

    public function test_a_reply_opened_from_a_notification_is_focused(): void
    {
        $reply = CommunityReply::factory()->answer()->create();

        $this->actingAs($reply->post->author)
            ->get(route('community.show', ['post' => $reply->community_post_id, 'reply' => $reply->id]))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('focus', $reply->id));
    }

    public function test_the_author_edits_their_reply_and_it_shows_as_edited(): void
    {
        $reply = CommunityReply::factory()->answer()->create(['body' => 'الإجابة الأولى']);

        $this->actingAs($reply->author)
            ->put(route('community.replies.update', $reply), ['body' => 'الإجابة بعد المراجعة'])
            ->assertRedirect();

        $reply->refresh();
        $this->assertSame('الإجابة بعد المراجعة', $reply->body);
        $this->assertNotNull($reply->edited_at);
        $this->assertTrue($reply->is_answer);
    }

    public function test_members_cannot_change_or_delete_the_replies_of_others(): void
    {
        $reply = CommunityReply::factory()->create(['body' => 'تعليق طالب']);

        foreach ([User::factory()->student()->create(), User::factory()->teacher()->create(), $reply->post->author] as $member) {
            $this->actingAs($member)->put(route('community.replies.update', $reply), ['body' => 'تغيير'])->assertForbidden();
            $this->actingAs($member)->delete(route('community.replies.destroy', $reply))->assertForbidden();
        }

        $this->actingAs(User::factory()->admin()->create())->put(route('community.replies.update', $reply), ['body' => 'تغيير'])->assertForbidden();

        $this->assertSame('تعليق طالب', $reply->fresh()->body);
    }

    public function test_the_author_and_the_administration_delete_replies(): void
    {
        $own = CommunityReply::factory()->create();
        $other = CommunityReply::factory()->answer()->create();

        $this->actingAs($own->author)->delete(route('community.replies.destroy', $own))->assertRedirect();
        $this->actingAs(User::factory()->admin()->create())->delete(route('community.replies.destroy', $other))->assertRedirect();

        $this->assertModelMissing($own);
        $this->assertModelMissing($other);
    }

    public function test_the_member_who_asked_marks_one_answer_as_the_answer_to_their_question(): void
    {
        $post = CommunityPost::factory()->create();
        $first = CommunityReply::factory()->answer()->for($post, 'post')->create();
        $second = CommunityReply::factory()->answer()->for($post, 'post')->create();

        $this->actingAs($post->author)->patch(route('community.replies.accept', $first))->assertRedirect();
        $this->assertNotNull($first->fresh()->accepted_at);

        $this->actingAs($post->author)->patch(route('community.replies.accept', $second))->assertRedirect();
        $this->assertNull($first->fresh()->accepted_at);
        $this->assertNotNull($second->fresh()->accepted_at);

        $this->actingAs($post->author)->patch(route('community.replies.accept', $second))->assertRedirect();
        $this->assertNull($second->fresh()->accepted_at);
    }

    public function test_only_the_member_who_asked_marks_an_answer_and_never_a_comment(): void
    {
        $post = CommunityPost::factory()->create();
        $answer = CommunityReply::factory()->answer()->for($post, 'post')->create();
        $comment = CommunityReply::factory()->for($post, 'post')->create();

        $this->actingAs($answer->author)->patch(route('community.replies.accept', $answer))->assertForbidden();
        $this->actingAs(User::factory()->admin()->create())->patch(route('community.replies.accept', $answer))->assertForbidden();
        $this->actingAs($post->author)->patch(route('community.replies.accept', $comment))->assertForbidden();

        $this->assertSame(0, CommunityReply::query()->whereNotNull('accepted_at')->count());
    }
}
