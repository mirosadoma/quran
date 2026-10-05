<?php

namespace Tests\Feature;

use App\Enums\JoinRequestStatus;
use App\Models\Academy;
use App\Models\AcademyJoinRequest;
use App\Models\Halaqa;
use App\Models\User;
use App\Notifications\JoinRequestAnswered;
use App\Notifications\JoinRequestReceived;
use App\Notifications\StudentLeftAcademy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class JoinRequestsTest extends TestCase
{
    use RefreshDatabase;

    protected Academy $academy;

    protected User $manager;

    protected User $student;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        $this->academy = Academy::factory()->create();
        $this->manager = User::factory()->manager($this->academy)->create();
        // A student who registered on their own, without academy.
        $this->student = User::factory()->student()->create();
    }

    public function test_a_student_without_academy_asks_to_join_one_and_its_manager_is_notified(): void
    {
        $this->actingAs($this->student)
            ->post(route('academies.join', $this->academy), ['message' => 'أحفظ جزء عمّ'])
            ->assertRedirect(route('my-academy'));

        $request = AcademyJoinRequest::query()->sole();
        $this->assertSame(JoinRequestStatus::Pending, $request->status);
        $this->assertSame('أحفظ جزء عمّ', $request->message);
        $this->assertNull($this->student->fresh()->academy_id);

        Notification::assertSentTo($this->manager, JoinRequestReceived::class);
    }

    public function test_a_student_asks_one_academy_at_a_time(): void
    {
        $this->actingAs($this->student)->post(route('academies.join', $this->academy));
        $this->actingAs($this->student)->post(route('academies.join', Academy::factory()->create()));

        $this->assertSame(1, AcademyJoinRequest::query()->count());

        $closed = Academy::factory()->closed()->create();
        $other = User::factory()->student()->create();
        $this->actingAs($other)->post(route('academies.join', $closed));

        $this->assertSame(0, $other->joinRequests()->count());
    }

    public function test_a_student_of_an_academy_cannot_ask_another_one(): void
    {
        $member = User::factory()->student()->inAcademy($this->academy)->create();

        $this->actingAs($member)->post(route('academies.join', Academy::factory()->create()));

        $this->assertSame(0, $member->joinRequests()->count());
    }

    public function test_the_manager_accepts_a_request_and_the_student_joins_the_academy(): void
    {
        $request = AcademyJoinRequest::factory()->for($this->academy)->for($this->student)->create();

        $this->actingAs($this->manager)
            ->patch(route('join-requests.accept', $request), ['response' => 'أهلًا بك'])
            ->assertRedirect();

        $request->refresh();
        $this->assertSame(JoinRequestStatus::Accepted, $request->status);
        $this->assertSame('أهلًا بك', $request->response);
        $this->assertSame($this->manager->id, $request->decided_by);
        $this->assertSame($this->academy->id, $this->student->fresh()->academy_id);

        Notification::assertSentTo($this->student, JoinRequestAnswered::class);
    }

    public function test_the_manager_declines_a_request_and_the_student_may_ask_another_academy(): void
    {
        $request = AcademyJoinRequest::factory()->for($this->academy)->for($this->student)->create();

        $this->actingAs($this->manager)->patch(route('join-requests.reject', $request))->assertRedirect();

        $this->assertSame(JoinRequestStatus::Rejected, $request->fresh()->status);
        $this->assertNull($this->student->fresh()->academy_id);

        $this->actingAs($this->student)->post(route('academies.join', Academy::factory()->create()));
        $this->assertSame(1, $this->student->joinRequests()->pending()->count());
    }

    public function test_a_manager_answers_only_the_requests_of_their_academy(): void
    {
        $request = AcademyJoinRequest::factory()->for(Academy::factory())->for($this->student)->create();

        $this->actingAs($this->manager)->patch(route('join-requests.accept', $request))->assertForbidden();

        $this->actingAs($this->manager)
            ->get(route('join-requests.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('join-requests/index')->where('requests.data', []));

        $this->actingAs($this->student)->get(route('join-requests.index'))->assertForbidden();
    }

    public function test_the_administration_answers_the_requests_of_every_academy(): void
    {
        $request = AcademyJoinRequest::factory()->for($this->academy)->for($this->student)->create();

        $this->actingAs(User::factory()->admin()->create())->patch(route('join-requests.accept', $request))->assertRedirect();

        $this->assertSame($this->academy->id, $this->student->fresh()->academy_id);
    }

    public function test_a_student_cancels_their_waiting_request_only(): void
    {
        $request = AcademyJoinRequest::factory()->for($this->academy)->for($this->student)->create();
        $someoneElse = AcademyJoinRequest::factory()->for($this->academy)->create();

        $this->actingAs($this->student)->patch(route('join-requests.cancel', $request))->assertRedirect();
        $this->assertSame(JoinRequestStatus::Cancelled, $request->fresh()->status);

        $this->actingAs($this->student)->patch(route('join-requests.cancel', $someoneElse))->assertForbidden();
    }

    public function test_a_student_leaves_the_academy_and_can_then_join_another(): void
    {
        $member = User::factory()->student()->inAcademy($this->academy)->create();
        $halaqa = Halaqa::factory()->for($this->academy)->create();
        $halaqa->students()->attach($member);

        $this->actingAs($member)->post(route('my-academy.leave'))->assertRedirect(route('my-academy'));

        $member->refresh();
        $this->assertNull($member->academy_id);
        $this->assertSame(0, $member->halaqat()->count());
        Notification::assertSentTo($this->manager, StudentLeftAcademy::class);

        $this->actingAs($member)->post(route('academies.join', Academy::factory()->create()));
        $this->assertSame(1, $member->joinRequests()->pending()->count());
    }

    public function test_a_student_without_academy_has_their_own_dashboard_and_academies_page(): void
    {
        $this->actingAs($this->student)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('dashboard/independent')
                ->where('joinRequest', null)
                ->has('academies', 1));

        $this->actingAs($this->student)
            ->get(route('my-academy', ['join' => $this->academy->slug]))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('academies/mine')
                ->where('academy', null)
                ->where('join', $this->academy->slug)
                ->has('academies', 1));

        $this->actingAs($this->manager)->get(route('my-academy'))->assertForbidden();
    }
}
