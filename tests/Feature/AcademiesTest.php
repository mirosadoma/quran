<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Http\Controllers\ImpersonationController;
use App\Models\Academy;
use App\Models\Halaqa;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class AcademiesTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected Academy $academy;

    protected User $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->admin()->create();
        $this->academy = Academy::factory()->create();
        $this->manager = User::factory()->manager($this->academy)->create();
    }

    public function test_the_administration_creates_an_academy_with_its_manager_account(): void
    {
        $this->actingAs($this->admin)
            ->post(route('academies.store'), [
                'name' => 'أكاديمية الهدى',
                'gender' => 'female',
                'accepts_requests' => true,
                'is_active' => true,
                'manager' => ['name' => 'أ. مريم', 'email' => 'Maryam@Example.com', 'password' => 'secret-pass'],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $academy = Academy::query()->where('name', 'أكاديمية الهدى')->sole();
        $manager = $academy->manager;

        $this->assertNotNull($manager);
        $this->assertSame(UserRole::Manager, $manager->role);
        $this->assertSame($academy->id, $manager->academy_id);
        $this->assertSame('maryam@example.com', $manager->email);
        $this->assertTrue(Hash::check('secret-pass', $manager->password));
        $this->assertNotSame('', $academy->slug);
    }

    public function test_a_new_academy_needs_the_account_of_its_manager(): void
    {
        $this->actingAs($this->admin)
            ->post(route('academies.store'), ['name' => 'أكاديمية بلا مسؤول', 'gender' => 'mixed'])
            ->assertSessionHasErrors(['manager.name', 'manager.email', 'manager.password']);
    }

    public function test_a_manager_cannot_list_or_create_academies(): void
    {
        $this->actingAs($this->manager)->get(route('academies.index'))->assertForbidden();
        $this->actingAs($this->manager)->post(route('academies.store'), ['name' => 'x', 'gender' => 'mixed'])->assertForbidden();
    }

    public function test_a_manager_edits_the_profile_of_their_own_academy_but_cannot_deactivate_it(): void
    {
        $this->actingAs($this->manager)
            ->put(route('academies.update', $this->academy), [
                'name' => 'الاسم الجديد',
                'gender' => 'mixed',
                'accepts_requests' => false,
                'is_active' => false,
            ])
            ->assertSessionHasNoErrors();

        $this->academy->refresh();
        $this->assertSame('الاسم الجديد', $this->academy->name);
        $this->assertFalse($this->academy->accepts_requests);
        $this->assertTrue($this->academy->is_active);

        $other = Academy::factory()->create();

        $this->actingAs($this->manager)->get(route('academies.edit', $other))->assertForbidden();
        $this->actingAs($this->manager)->put(route('academies.update', $other), ['name' => 'x', 'gender' => 'mixed'])->assertForbidden();
        $this->actingAs($this->manager)->patch(route('academies.toggle', $this->academy))->assertForbidden();
    }

    public function test_the_administration_enters_an_academy_with_the_account_of_its_manager_and_comes_back(): void
    {
        $this->actingAs($this->admin)
            ->post(route('academies.impersonate', $this->academy))
            ->assertRedirect(route('dashboard'));

        $this->assertAuthenticatedAs($this->manager);
        $this->assertSame($this->admin->id, session(ImpersonationController::SESSION_KEY));

        $this->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('dashboard/admin')
                ->where('impersonating.academy', $this->academy->name)
                ->where('academy.id', $this->academy->id));

        $this->post(route('impersonation.stop'))->assertRedirect(route('academies.show', $this->academy));

        $this->assertAuthenticatedAs($this->admin);
        $this->assertNull(session(ImpersonationController::SESSION_KEY));
    }

    public function test_only_the_administration_enters_an_academy(): void
    {
        $this->actingAs($this->manager)->post(route('academies.impersonate', $this->academy))->assertForbidden();
        $this->actingAs($this->manager)->post(route('impersonation.stop'))->assertForbidden();
    }

    public function test_the_members_of_a_deactivated_academy_cannot_use_the_platform(): void
    {
        $teacher = User::factory()->teacher()->inAcademy($this->academy)->create();

        $this->actingAs($this->admin)->patch(route('academies.toggle', $this->academy))->assertRedirect();
        $this->assertFalse($this->academy->fresh()->is_active);

        $this->actingAs($teacher)->get(route('dashboard'))->assertRedirect(route('login'));
        $this->assertGuest();

        // The administration can still enter it to set things right.
        $this->actingAs($this->admin)->post(route('academies.impersonate', $this->academy));
        $this->get(route('dashboard'))->assertOk();
    }

    public function test_an_academy_is_archived_restored_and_then_deleted_for_good(): void
    {
        $teacher = User::factory()->teacher()->inAcademy($this->academy)->create();
        $student = User::factory()->student()->inAcademy($this->academy)->create();
        $halaqa = Halaqa::factory()->for($this->academy)->create(['teacher_id' => $teacher->id]);

        $this->actingAs($this->admin)->delete(route('academies.destroy', $this->academy))->assertRedirect(route('academies.index'));
        $this->assertSoftDeleted($this->academy);

        $this->actingAs($student)->get(route('dashboard'))->assertRedirect(route('login'));

        $this->actingAs($this->admin)->patch(route('academies.restore', $this->academy))->assertRedirect();
        $this->assertNotSoftDeleted($this->academy);

        // Deleting for good is only possible from the archive.
        $this->actingAs($this->admin)->delete(route('academies.force-destroy', $this->academy))->assertForbidden();

        $this->actingAs($this->admin)->delete(route('academies.destroy', $this->academy));
        $this->actingAs($this->admin)->delete(route('academies.force-destroy', $this->academy))->assertRedirect();

        $this->assertDatabaseMissing('academies', ['id' => $this->academy->id]);
        $this->assertModelMissing($halaqa);
        $this->assertModelMissing($teacher);
        $this->assertModelMissing($this->manager);
        $this->assertNull($student->fresh()->academy_id);
    }

    public function test_a_manager_sees_only_the_people_and_halaqat_of_their_academy(): void
    {
        $teacher = User::factory()->teacher()->inAcademy($this->academy)->create();
        $halaqa = Halaqa::factory()->for($this->academy)->create(['teacher_id' => $teacher->id]);

        $other = Academy::factory()->create();
        $outsider = User::factory()->student()->inAcademy($other)->create();
        Halaqa::factory()->for($other)->create();

        $this->actingAs($this->manager)
            ->get(route('users.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->where('users.data', fn ($users) => collect($users)->pluck('id')->all() === [$teacher->id])
                ->where('academies', []));

        $this->actingAs($this->manager)
            ->get(route('halaqat.index'))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('halaqat.data', fn ($halaqat) => collect($halaqat)->pluck('id')->all() === [$halaqa->id]));

        $this->actingAs($this->manager)->get(route('users.show', $outsider))->assertForbidden();
        $this->actingAs($this->manager)->get(route('users.show', $this->admin))->assertForbidden();
    }

    public function test_a_manager_adds_teachers_and_students_to_their_academy_only(): void
    {
        $other = Academy::factory()->create();

        $this->actingAs($this->manager)
            ->post(route('users.store'), [
                'name' => 'معلم جديد',
                'email' => 'teacher@example.com',
                'password' => 'password',
                'role' => 'teacher',
                'academy_id' => $other->id,
                'timezone' => 'Africa/Cairo',
                'locale' => 'ar',
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame($this->academy->id, User::query()->where('email', 'teacher@example.com')->value('academy_id'));

        $this->actingAs($this->manager)
            ->post(route('users.store'), [
                'name' => 'مدير',
                'email' => 'admin2@example.com',
                'password' => 'password',
                'role' => 'admin',
                'timezone' => 'Africa/Cairo',
                'locale' => 'ar',
            ])
            ->assertSessionHasErrors('role');
    }

    public function test_the_administration_chooses_the_academy_of_a_new_halaqa_and_its_teacher_belongs_to_it(): void
    {
        $teacher = User::factory()->teacher()->inAcademy($this->academy)->create();
        $foreignTeacher = User::factory()->teacher()->inAcademy(Academy::factory()->create())->create();

        $halaqa = [
            'name' => 'حلقة الفجر',
            'gender' => 'mixed',
            'schedule' => [['day' => 0, 'time' => '17:00']],
            'duration_minutes' => 60,
            'timezone' => 'Africa/Cairo',
            'meeting_provider' => 'jitsi',
            'color' => 'emerald',
            'is_active' => true,
        ];

        $this->actingAs($this->admin)->post(route('halaqat.store'), $halaqa)->assertSessionHasErrors('academy_id');

        $this->actingAs($this->admin)
            ->post(route('halaqat.store'), [...$halaqa, 'academy_id' => $this->academy->id, 'teacher_id' => $foreignTeacher->id])
            ->assertSessionHasErrors('teacher_id');

        $this->actingAs($this->admin)
            ->post(route('halaqat.store'), [...$halaqa, 'academy_id' => $this->academy->id, 'teacher_id' => $teacher->id])
            ->assertSessionHasNoErrors();

        $this->assertSame($this->academy->id, Halaqa::query()->where('name', 'حلقة الفجر')->value('academy_id'));
    }

    public function test_a_manager_creates_halaqat_in_their_own_academy(): void
    {
        $this->actingAs($this->manager)
            ->post(route('halaqat.store'), [
                'academy_id' => Academy::factory()->create()->id,
                'name' => 'حلقة المغرب',
                'gender' => 'mixed',
                'schedule' => [['day' => 1, 'time' => '18:00']],
                'duration_minutes' => 45,
                'timezone' => 'Africa/Cairo',
                'meeting_provider' => 'jitsi',
                'color' => 'teal',
                'is_active' => true,
            ])
            ->assertSessionHasNoErrors();

        $this->assertSame($this->academy->id, Halaqa::query()->where('name', 'حلقة المغرب')->value('academy_id'));
    }

    public function test_the_academy_pages_render(): void
    {
        $this->actingAs($this->admin)
            ->get(route('academies.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('academies/index')->where('totals.all', 1));

        $this->actingAs($this->admin)
            ->get(route('academies.show', $this->academy))
            ->assertInertia(fn (AssertableInertia $page) => $page->component('academies/show')->where('can.impersonate', true));

        $this->actingAs($this->admin)->get(route('academies.create'))->assertInertia(fn (AssertableInertia $page) => $page->component('academies/form'));

        $this->actingAs($this->manager)
            ->get(route('academies.edit', $this->academy))
            ->assertInertia(fn (AssertableInertia $page) => $page->component('academies/form')->where('academy.id', $this->academy->id));
    }
}
