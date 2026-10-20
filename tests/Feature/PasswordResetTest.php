<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class PasswordResetTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
    }

    public function test_a_user_asks_for_a_reset_link_and_receives_it_by_email(): void
    {
        Notification::fake();
        $user = User::factory()->student()->create(['email' => 'student@example.com']);

        $this->get(route('password.request'))->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->component('auth/forgot-password'));

        $this->post(route('password.email'), ['email' => 'Student@Example.com'])
            ->assertRedirect()
            ->assertSessionHasNoErrors()
            ->assertSessionHas('status');

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use ($user): bool {
            $mail = $notification->toMail($user);

            return in_array('mail', $notification->via($user), true)
                && str_contains($mail->actionUrl, route('password.reset', $notification->token))
                && str_contains($mail->actionUrl, 'email=student%40example.com');
        });
    }

    public function test_an_unknown_email_gets_the_same_answer_without_an_email(): void
    {
        Notification::fake();

        $this->post(route('password.email'), ['email' => 'nobody@example.com'])
            ->assertRedirect()
            ->assertSessionHasNoErrors()
            ->assertSessionHas('status');

        Notification::assertNothingSent();
    }

    public function test_the_link_opens_the_reset_page_and_sets_the_new_password(): void
    {
        Notification::fake();
        $user = User::factory()->student()->create(['email' => 'student@example.com']);
        $this->post(route('password.email'), ['email' => 'student@example.com']);
        $token = '';
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$token): bool {
            $token = $notification->token;

            return true;
        });

        $this->get(route('password.reset', ['token' => $token, 'email' => 'student@example.com']))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('auth/reset-password')
                ->where('email', 'student@example.com')
                ->where('token', $token));

        $this->post(route('password.store'), [
            'token' => $token,
            'email' => 'student@example.com',
            'password' => 'new-secret-123',
            'password_confirmation' => 'new-secret-123',
        ])
            ->assertRedirect(route('login'))
            ->assertSessionHasNoErrors();

        $this->assertTrue(Hash::check('new-secret-123', $user->fresh()->password));

        // The new password signs in, and the link cannot be used twice.
        $this->post(route('login.store'), ['login' => 'student@example.com', 'password' => 'new-secret-123'])->assertSessionHasNoErrors();
        $this->assertAuthenticatedAs($user);
        $this->post(route('logout'));

        $this->post(route('password.store'), [
            'token' => $token,
            'email' => 'student@example.com',
            'password' => 'another-secret-123',
            'password_confirmation' => 'another-secret-123',
        ])->assertSessionHasErrors('email');
    }

    public function test_a_wrong_token_or_a_weak_password_is_refused(): void
    {
        $user = User::factory()->student()->create(['email' => 'student@example.com']);

        $this->post(route('password.store'), [
            'token' => 'not-a-real-token',
            'email' => 'student@example.com',
            'password' => 'new-secret-123',
            'password_confirmation' => 'new-secret-123',
        ])->assertSessionHasErrors('email');

        $this->post(route('password.store'), [
            'token' => 'whatever',
            'email' => 'student@example.com',
            'password' => 'short',
            'password_confirmation' => 'short',
        ])->assertSessionHasErrors('password');

        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }
}
