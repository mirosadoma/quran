<?php

namespace Tests\Feature;

use App\Http\Controllers\Auth\PasswordResetCodeController;
use App\Models\User;
use App\Notifications\PasswordResetCode;
use App\Services\PasswordResetCodes;
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
        Notification::fake();
    }

    public function test_a_user_asks_for_a_code_and_receives_it_by_email_in_their_language(): void
    {
        $user = User::factory()->student()->create(['email' => 'student@example.com', 'locale' => 'ar']);

        $this->get(route('password.request'))->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->component('auth/forgot-password'));

        $this->post(route('password.email'), ['email' => 'Student@Example.com'])
            ->assertRedirect(route('password.code'))
            ->assertSessionHasNoErrors()
            ->assertSessionHas(PasswordResetCodeController::SESSION_KEY, 'student@example.com');

        $code = $this->sentCode($user);
        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);

        Notification::assertSentTo($user, PasswordResetCode::class, function (PasswordResetCode $notification, array $channels) use ($user, $code): bool {
            $mail = $notification->toMail($user);

            return $channels === ['mail'] && str_contains($mail->subject, $code) && str_contains((string) $mail->render(), $code);
        });

        $this->get(route('password.code'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('auth/reset-code')
                ->where('email', 'student@example.com')
                ->where('minutes', PasswordResetCodes::CODE_MINUTES)
                ->whereNot('resendAt', null)
                ->has('status'));
    }

    public function test_every_account_of_the_shared_sign_in_page_gets_a_code_whatever_its_role(): void
    {
        $accounts = [
            'admin' => User::factory()->admin()->create(['email' => 'admin@example.com']),
            'manager' => User::factory()->manager()->create(['email' => 'manager@example.com']),
            'teacher' => User::factory()->teacher()->create(['email' => 'teacher@example.com']),
            'student' => User::factory()->student()->create(['email' => 'student@example.com']),
        ];

        foreach ($accounts as $role => $user) {
            $this->flushSession();

            $this->post(route('password.email'), ['email' => strtoupper((string) $user->email)])
                ->assertRedirect(route('password.code'))
                ->assertSessionHasNoErrors();

            Notification::assertSentTo($user, PasswordResetCode::class);
            $this->assertSame($user->role->value, $role);
        }
    }

    public function test_an_email_without_account_is_told_so_and_stays_on_the_first_page(): void
    {
        $this->from(route('password.request'))
            ->post(route('password.email'), ['email' => 'nobody@example.com'])
            ->assertRedirect(route('password.request'))
            ->assertSessionHasErrors(['email' => __('passwords.user')])
            ->assertSessionMissing(PasswordResetCodeController::SESSION_KEY);

        Notification::assertNothingSent();

        $this->get(route('password.code'))->assertRedirect(route('password.request'));
    }

    public function test_the_right_code_opens_the_new_password_page_and_the_new_password_signs_in(): void
    {
        $user = User::factory()->student()->create(['email' => 'student@example.com']);
        $this->post(route('password.email'), ['email' => 'student@example.com']);
        $code = $this->sentCode($user);

        $response = $this->post(route('password.code.verify'), ['code' => $code])->assertSessionHasNoErrors();
        $this->assertStringStartsWith(url('reset-password').'/', (string) $response->headers->get('Location'));

        $this->get((string) $response->headers->get('Location'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('auth/reset-password')
                ->where('email', 'student@example.com')
                ->has('token'));

        $token = basename(parse_url((string) $response->headers->get('Location'), PHP_URL_PATH));

        $this->post(route('password.store'), [
            'token' => $token,
            'email' => 'student@example.com',
            'password' => 'new-secret-123',
            'password_confirmation' => 'new-secret-123',
        ])
            ->assertRedirect(route('login'))
            ->assertSessionHasNoErrors();

        $this->assertTrue(Hash::check('new-secret-123', $user->fresh()->password));

        $this->post(route('login.store'), ['login' => 'student@example.com', 'password' => 'new-secret-123'])->assertSessionHasNoErrors();
        $this->assertAuthenticatedAs($user);
        $this->post(route('logout'));

        // The code and the token work once.
        $this->withSession([PasswordResetCodeController::SESSION_KEY => 'student@example.com'])
            ->post(route('password.code.verify'), ['code' => $code])
            ->assertSessionHasErrors('code');

        $this->post(route('password.store'), [
            'token' => $token,
            'email' => 'student@example.com',
            'password' => 'another-secret-123',
            'password_confirmation' => 'another-secret-123',
        ])->assertSessionHasErrors('email');
    }

    public function test_five_wrong_codes_burn_the_code(): void
    {
        $user = User::factory()->student()->create(['email' => 'student@example.com']);
        $this->post(route('password.email'), ['email' => 'student@example.com']);
        $code = $this->sentCode($user);
        $wrong = $code === '000000' ? '111111' : '000000';

        foreach (range(1, PasswordResetCodes::MAX_ATTEMPTS) as $try) {
            $this->post(route('password.code.verify'), ['code' => $wrong])->assertSessionHasErrors('code');
        }

        $this->post(route('password.code.verify'), ['code' => $code])->assertSessionHasErrors('code');
        $this->assertTrue(Hash::check('password', $user->fresh()->password));
    }

    public function test_a_code_expires(): void
    {
        $user = User::factory()->student()->create(['email' => 'student@example.com']);
        $this->post(route('password.email'), ['email' => 'student@example.com']);
        $code = $this->sentCode($user);

        $this->travel(PasswordResetCodes::CODE_MINUTES + 1)->minutes();

        $this->post(route('password.code.verify'), ['code' => $code])->assertSessionHasErrors('code');
    }

    public function test_a_new_code_waits_a_minute_and_replaces_the_previous_one(): void
    {
        $user = User::factory()->student()->create(['email' => 'student@example.com']);
        $this->post(route('password.email'), ['email' => 'student@example.com']);
        $first = $this->sentCode($user);

        $this->post(route('password.code.resend'))->assertSessionHasErrors('code');
        // Asking again from the first page within the minute keeps the same code.
        $this->post(route('password.email'), ['email' => 'student@example.com'])->assertSessionHasNoErrors();
        Notification::assertSentToTimes($user, PasswordResetCode::class, 1);

        $this->travel(PasswordResetCodes::RESEND_SECONDS + 1)->seconds();

        $this->post(route('password.code.resend'))->assertSessionHasNoErrors()->assertSessionHas('status');
        Notification::assertSentToTimes($user, PasswordResetCode::class, 2);
        $second = $this->sentCode($user);

        if ($first !== $second) {
            $this->post(route('password.code.verify'), ['code' => $first])->assertSessionHasErrors('code');
        }

        $this->post(route('password.code.verify'), ['code' => $second])->assertSessionHasNoErrors()->assertRedirect();
    }

    public function test_the_code_page_needs_an_email_first(): void
    {
        $this->get(route('password.code'))->assertRedirect(route('password.request'));
        $this->post(route('password.code.verify'), ['code' => '123456'])->assertRedirect(route('password.request'));
        $this->post(route('password.code.resend'))->assertRedirect(route('password.request'));
    }

    public function test_an_email_that_cannot_leave_is_told_to_the_user(): void
    {
        User::factory()->student()->create(['email' => 'student@example.com']);
        Notification::shouldReceive('send')->andThrow(new \RuntimeException('Connection could not be established'));

        $this->post(route('password.email'), ['email' => 'student@example.com'])->assertSessionHasErrors('email');
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

    /**
     * The last code emailed to the user.
     */
    protected function sentCode(User $user): string
    {
        $code = null;

        Notification::assertSentTo($user, PasswordResetCode::class, function (PasswordResetCode $notification) use (&$code): bool {
            $code = $notification->code;

            return true;
        });

        return (string) $code;
    }
}
