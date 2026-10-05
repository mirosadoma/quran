<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Academy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_registration_page_opens_and_remembers_the_academy_the_visitor_came_from(): void
    {
        $academy = Academy::factory()->create();

        $this->get(route('register'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page->component('auth/register')->where('academy', null));

        $this->get(route('register', ['academy' => $academy->slug]))
            ->assertInertia(fn (AssertableInertia $page) => $page->where('academy.slug', $academy->slug));
    }

    public function test_a_visitor_creates_an_account_and_becomes_a_student_without_academy(): void
    {
        $this->post(route('register.store'), [
            'name' => 'عبد الله',
            'email' => 'Abdullah@Example.com',
            'gender' => 'male',
            'password' => 'secret-pass',
            'password_confirmation' => 'secret-pass',
            'terms' => true,
        ])->assertRedirect(route('dashboard'));

        $user = User::query()->where('email', 'abdullah@example.com')->sole();

        $this->assertAuthenticatedAs($user);
        $this->assertSame(UserRole::Student, $user->role);
        $this->assertNull($user->academy_id);
        $this->assertTrue($user->is_active);

        $this->get(route('dashboard'))->assertInertia(fn (AssertableInertia $page) => $page->component('dashboard/independent'));
    }

    public function test_a_visitor_from_an_academy_page_continues_to_the_request_to_join_it(): void
    {
        $academy = Academy::factory()->create();

        $this->post(route('register.store'), [
            'name' => 'مريم',
            'phone' => '+201009998877',
            'password' => 'secret-pass',
            'password_confirmation' => 'secret-pass',
            'terms' => true,
            'academy' => $academy->slug,
        ])->assertRedirect(route('my-academy', ['join' => $academy->slug]));
    }

    public function test_the_account_needs_the_terms_a_contact_and_a_confirmed_password(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->post(route('register.store'), [
            'name' => 'زائر',
            'email' => 'taken@example.com',
            'password' => 'secret-pass',
            'password_confirmation' => 'another-pass',
        ])->assertSessionHasErrors(['email', 'password', 'terms']);

        $this->post(route('register.store'), ['name' => 'زائر', 'password' => 'secret-pass', 'password_confirmation' => 'secret-pass', 'terms' => true])
            ->assertSessionHasErrors(['email', 'phone']);

        $this->assertGuest();
    }

    public function test_a_signed_in_user_is_sent_to_the_dashboard_instead_of_registering(): void
    {
        $this->actingAs(User::factory()->create())->get(route('register'))->assertRedirect(route('dashboard'));
    }
}
