<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_sign_in_is_always_remembered_so_the_session_lasts_until_sign_out(): void
    {
        $user = User::factory()->student()->create(['email' => 'student@example.com']);

        $response = $this->post(route('login.store'), ['login' => 'student@example.com', 'password' => 'password', 'remember' => false]);

        $response->assertRedirect()->assertSessionHasNoErrors();
        $this->assertAuthenticatedAs($user);
        $this->assertNotNull($response->getCookie(Auth::guard('web')->getRecallerName()), 'The remember-me cookie is set.');
        $this->assertNotNull($user->fresh()->remember_token);
        // A session lasts a year, not two hours.
        $this->assertGreaterThanOrEqual(525600, config('session.lifetime'));
    }

    public function test_a_new_account_is_remembered_too(): void
    {
        $response = $this->post(route('register.store'), [
            'name' => 'يوسف أحمد',
            'email' => 'new@example.com',
            'gender' => 'male',
            'password' => 'password',
            'password_confirmation' => 'password',
            'terms' => true,
        ]);

        $response->assertRedirect(route('dashboard'))->assertSessionHasNoErrors();
        $this->assertNotNull($response->getCookie(Auth::guard('web')->getRecallerName()));
        $this->assertNotNull(User::query()->where('email', 'new@example.com')->sole()->remember_token);
    }

    public function test_signing_out_forgets_the_user(): void
    {
        $user = User::factory()->student()->create();

        $this->actingAs($user)->post(route('logout'))->assertRedirect();

        $this->assertGuest();
    }
}
