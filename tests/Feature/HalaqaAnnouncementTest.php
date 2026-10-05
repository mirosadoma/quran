<?php

namespace Tests\Feature;

use App\Enums\AnnouncementDelivery;
use App\Enums\SessionStatus;
use App\Models\Halaqa;
use App\Models\HalaqaAnnouncement;
use App\Models\HalaqaSession;
use App\Models\User;
use App\Notifications\HalaqaAnnouncementPosted;
use App\Services\SessionLifecycle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class HalaqaAnnouncementTest extends TestCase
{
    use RefreshDatabase;

    protected User $teacher;

    protected User $student;

    protected Halaqa $halaqa;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->teacher = User::factory()->teacher()->create(['timezone' => 'UTC']);
        $this->student = User::factory()->student()->create();
        $this->halaqa = Halaqa::factory()->create(['teacher_id' => $this->teacher->id]);
        $this->halaqa->students()->attach($this->student);
    }

    public function test_a_message_sent_now_reaches_every_student(): void
    {
        $this->actingAs($this->teacher)
            ->post(route('halaqat.announcements.store', $this->halaqa), [
                'kind' => 'hadith',
                'title' => 'فضل القرآن',
                'body' => 'خيركم من تعلم القرآن وعلمه',
                'delivery' => 'now',
            ])
            ->assertSessionHasNoErrors();

        $announcement = HalaqaAnnouncement::query()->sole();

        $this->assertNotNull($announcement->sent_at);
        Notification::assertSentTo($this->student, HalaqaAnnouncementPosted::class, function (HalaqaAnnouncementPosted $notification): bool {
            return str_contains((string) $notification->url(), 'tab=messages');
        });
        Notification::assertNotSentTo($this->teacher, HalaqaAnnouncementPosted::class);
    }

    public function test_a_scheduled_message_waits_for_its_time(): void
    {
        $this->actingAs($this->teacher)
            ->post(route('halaqat.announcements.store', $this->halaqa), [
                'kind' => 'reminder',
                'body' => 'لا تنسوا مراجعة وردكم',
                'delivery' => 'scheduled',
                'date' => now()->addDay()->toDateString(),
                'time' => '18:30',
            ])
            ->assertSessionHasNoErrors();

        $announcement = HalaqaAnnouncement::query()->sole();

        $this->assertNull($announcement->sent_at);
        $this->assertSame('18:30', $announcement->scheduled_at->format('H:i'));

        $this->artisan('announcements:send')->assertSuccessful();
        Notification::assertNothingSent();

        $this->travelTo($announcement->scheduled_at->copy()->addMinute());
        $this->artisan('announcements:send')->assertSuccessful();

        Notification::assertSentToTimes($this->student, HalaqaAnnouncementPosted::class, 1);
        $this->assertNotNull($announcement->fresh()->sent_at);
    }

    public function test_a_scheduled_message_must_be_in_the_future(): void
    {
        $this->actingAs($this->teacher)
            ->post(route('halaqat.announcements.store', $this->halaqa), [
                'kind' => 'advice',
                'body' => 'نصيحة',
                'delivery' => 'scheduled',
                'date' => now()->subDay()->toDateString(),
                'time' => '10:00',
            ])
            ->assertSessionHasErrors('time');
    }

    public function test_a_message_for_sessions_is_delivered_when_each_session_starts(): void
    {
        $first = HalaqaSession::factory()->create(['halaqa_id' => $this->halaqa->id, 'teacher_id' => $this->teacher->id, 'starts_at' => now()->addHours(2)]);
        $second = HalaqaSession::factory()->create(['halaqa_id' => $this->halaqa->id, 'teacher_id' => $this->teacher->id, 'starts_at' => now()->addDays(2)]);

        $this->actingAs($this->teacher)
            ->post(route('halaqat.announcements.store', $this->halaqa), [
                'kind' => 'reminder',
                'body' => 'مرحبًا بكم في الجلسة',
                'delivery' => 'sessions',
                'session_ids' => [$first->id, $second->id],
            ])
            ->assertSessionHasNoErrors();

        $announcement = HalaqaAnnouncement::query()->sole();
        $this->assertSame(AnnouncementDelivery::Sessions, $announcement->delivery);
        Notification::assertNothingSent();

        app(SessionLifecycle::class)->start($first);

        Notification::assertSentToTimes($this->student, HalaqaAnnouncementPosted::class, 1);
        $this->assertNotNull($announcement->fresh()->sent_at);
        $this->assertNotNull($announcement->sessions()->whereKey($first->id)->first()->pivot->sent_at);
        $this->assertNull($announcement->sessions()->whereKey($second->id)->first()->pivot->sent_at);

        $this->travelTo($second->starts_at->copy()->addMinute());
        $this->artisan('announcements:send')->assertSuccessful();

        Notification::assertSentToTimes($this->student, HalaqaAnnouncementPosted::class, 2);
    }

    public function test_sessions_of_another_halaqa_cannot_be_chosen(): void
    {
        $other = HalaqaSession::factory()->create(['starts_at' => now()->addDay()]);

        $this->actingAs($this->teacher)
            ->post(route('halaqat.announcements.store', $this->halaqa), [
                'kind' => 'reminder',
                'body' => 'تذكير',
                'delivery' => 'sessions',
                'session_ids' => [$other->id],
            ])
            ->assertSessionHasErrors('session_ids.0');
    }

    public function test_only_the_teacher_of_the_halaqa_or_an_admin_can_send(): void
    {
        $payload = ['kind' => 'advice', 'body' => 'نصيحة', 'delivery' => 'now'];

        $this->actingAs($this->student)->post(route('halaqat.announcements.store', $this->halaqa), $payload)->assertForbidden();
        $this->actingAs(User::factory()->teacher()->create())->post(route('halaqat.announcements.store', $this->halaqa), $payload)->assertForbidden();
        $this->actingAs(User::factory()->admin()->create())->post(route('halaqat.announcements.store', $this->halaqa), $payload)->assertSessionHasNoErrors();

        $this->assertSame(1, HalaqaAnnouncement::query()->count());
    }

    public function test_a_message_can_be_edited_until_it_is_delivered(): void
    {
        $pending = HalaqaAnnouncement::factory()->scheduled()->create(['halaqa_id' => $this->halaqa->id, 'user_id' => $this->teacher->id]);
        $sent = HalaqaAnnouncement::factory()->create(['halaqa_id' => $this->halaqa->id, 'user_id' => $this->teacher->id]);
        $payload = ['kind' => 'word', 'body' => 'نص معدل', 'delivery' => 'scheduled', 'date' => now()->addDays(3)->toDateString(), 'time' => '09:00'];

        $this->actingAs($this->teacher)->put(route('announcements.update', $pending), $payload)->assertSessionHasNoErrors();
        $this->assertSame('نص معدل', $pending->fresh()->body);

        $this->actingAs($this->teacher)->put(route('announcements.update', $sent), $payload)->assertForbidden();

        $this->actingAs($this->teacher)->delete(route('announcements.destroy', $sent))->assertRedirect();
        $this->assertModelMissing($sent);
    }

    public function test_students_see_only_the_messages_already_sent(): void
    {
        HalaqaAnnouncement::factory()->create(['halaqa_id' => $this->halaqa->id, 'body' => 'رسالة وصلت']);
        HalaqaAnnouncement::factory()->scheduled()->create(['halaqa_id' => $this->halaqa->id, 'body' => 'رسالة مجدولة']);

        $this->actingAs($this->student)
            ->get(route('halaqat.show', ['halaqa' => $this->halaqa, 'tab' => 'messages']))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->has('announcements', 1)
                ->where('announcements.0.body', 'رسالة وصلت')
                ->where('focus.tab', 'messages'));

        $this->actingAs($this->teacher)
            ->get(route('halaqat.show', $this->halaqa))
            ->assertInertia(fn (AssertableInertia $page) => $page->has('announcements', 2));
    }

    public function test_cancelled_sessions_do_not_deliver_their_messages(): void
    {
        $session = HalaqaSession::factory()->create(['halaqa_id' => $this->halaqa->id, 'starts_at' => now()->subMinutes(5), 'status' => SessionStatus::Cancelled]);
        $announcement = HalaqaAnnouncement::factory()->forSessions()->create(['halaqa_id' => $this->halaqa->id]);
        $announcement->sessions()->attach($session);

        $this->artisan('announcements:send')->assertSuccessful();

        Notification::assertNothingSent();
        $this->assertNull($announcement->fresh()->sent_at);
    }
}
