<?php

namespace Tests\Feature;

use App\Models\CommunityPost;
use App\Models\Dhikr;
use App\Models\DhikrCategory;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class ContentCacheTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_adhkar_are_read_once_and_built_again_when_the_admin_changes_them(): void
    {
        $student = User::factory()->student()->create();
        $admin = User::factory()->admin()->create();
        $category = DhikrCategory::factory()->create(['is_active' => true]);
        $dhikr = Dhikr::factory()->for($category, 'category')->create(['is_active' => true, 'repeat' => 1]);

        $this->actingAs($student)->get(route('adhkar.index'))->assertOk();

        DB::enableQueryLog();
        $this->actingAs($student)->get(route('adhkar.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('categories.0.adhkar.0.repeat', 1));
        $this->assertFalse(collect(DB::getQueryLog())->contains(fn (array $query): bool => str_contains($query['query'], 'dhikr')));

        $this->actingAs($admin)->put(route('adhkar.update', $dhikr), ['dhikr_category_id' => $category->id, 'text' => $dhikr->text, 'repeat' => 7])->assertSessionHasNoErrors();
        $this->actingAs($student)->get(route('adhkar.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('categories.0.adhkar.0.repeat', 7));

        $this->actingAs($admin)->patch(route('adhkar.toggle', $dhikr));
        $this->actingAs($student)->get(route('adhkar.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page->has('categories.0.adhkar', 0));
    }

    public function test_the_video_library_shows_a_video_added_changed_or_deleted_at_once(): void
    {
        $student = User::factory()->student()->create();
        $video = Video::factory()->create(['academy_id' => null, 'halaqa_id' => null, 'is_published' => true, 'title' => 'الدرس الأول']);

        $this->actingAs($student)->get(route('videos.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page->has('videos.data', 1)->where('videos.data.0.title', 'الدرس الأول'));

        $video->update(['title' => 'الدرس الأول بعد التعديل']);
        Video::factory()->create(['academy_id' => null, 'halaqa_id' => null, 'is_published' => true]);

        $this->actingAs($student)->get(route('videos.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page->has('videos.data', 2)->where('videos.total', 2));

        $video->delete();

        $this->actingAs($student)->get(route('videos.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page->has('videos.data', 1));
        $this->get(route('site.videos'))
            ->assertInertia(fn (AssertableInertia $page) => $page->has('videos.data', 1));
    }

    public function test_the_questions_community_counts_a_new_question_at_once(): void
    {
        $student = User::factory()->student()->create();

        $this->actingAs($student)->get(route('community.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('counts.all', 0)->has('posts.data', 0));

        CommunityPost::factory()->create();

        $this->actingAs($student)->get(route('community.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('counts.all', 1)->has('posts.data', 1));
    }
}
