<?php

namespace Tests\Feature;

use App\Models\SentCode;
use App\Models\User;
use App\Notifications\PasswordResetCode;
use App\Services\PasswordResetCodes;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class SentCodesTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected User $student;

    protected PasswordResetCodes $codes;

    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutVite();
        Notification::fake();

        $this->admin = User::factory()->admin()->create();
        $this->student = User::factory()->student()->create(['name' => 'عائشة', 'email' => 'aisha@example.com', 'phone' => '+201001234567']);
        $this->codes = app(PasswordResetCodes::class);
    }

    /**
     * The code the user received by email.
     */
    protected function emailedCode(): string
    {
        $code = null;

        Notification::assertSentTo($this->student, PasswordResetCode::class, function (PasswordResetCode $notification) use (&$code): bool {
            $code = $notification->code;

            return true;
        });

        return (string) $code;
    }

    /**
     * @return array<int, string> the status of every listed code, newest first
     */
    protected function statuses(): array
    {
        $statuses = [];

        $this->actingAs($this->admin)
            ->get(route('sent-codes.index'))
            ->assertInertia(function (AssertableInertia $page) use (&$statuses) {
                $statuses = collect($page->toArray()['props']['codes'])->pluck('status')->all();
            });

        return $statuses;
    }

    public function test_the_administration_sees_the_codes_of_the_last_two_hours_with_their_accounts(): void
    {
        SentCode::factory()->create(['created_at' => now()->subHours(SentCode::KEEP_HOURS)->subMinute()]);

        $this->codes->send($this->student);

        $this->actingAs($this->admin)
            ->get(route('sent-codes.index'))
            ->assertOk()
            ->assertInertia(fn (AssertableInertia $page) => $page
                ->component('sent-codes/index')
                ->has('codes', 1)
                ->where('codes.0.code', $this->emailedCode())
                ->where('codes.0.status', 'valid')
                ->where('codes.0.purpose', 'password_reset')
                ->where('codes.0.user.name', 'عائشة')
                ->where('codes.0.user.email', 'aisha@example.com')
                ->where('codes.0.user.phone', '+201001234567')
                ->where('keepHours', SentCode::KEEP_HOURS));
    }

    public function test_only_the_administration_opens_the_codes(): void
    {
        foreach ([User::factory()->manager()->create(), User::factory()->teacher()->create(), $this->student] as $user) {
            $this->actingAs($user)->get(route('sent-codes.index'))->assertForbidden();
        }

        $this->post(route('logout'));
        $this->get(route('sent-codes.index'))->assertRedirect(route('login'));
    }

    public function test_the_codes_are_stored_encrypted(): void
    {
        $this->codes->send($this->student);

        $stored = DB::table('sent_codes')->value('code');

        $this->assertNotSame($this->emailedCode(), $stored);
        $this->assertSame($this->emailedCode(), SentCode::query()->sole()->code);
    }

    public function test_the_page_tells_which_code_still_works(): void
    {
        $this->codes->send($this->student);
        $this->travel(PasswordResetCodes::RESEND_SECONDS + 1)->seconds();
        $this->codes->send($this->student);

        $this->assertSame(['valid', 'replaced'], $this->statuses());

        $newest = SentCode::query()->latest('id')->first()->code;
        $this->codes->verify('aisha@example.com', $newest);

        $this->assertSame(['used', 'replaced'], $this->statuses());
    }

    public function test_a_code_blocked_by_wrong_tries_or_expired_is_marked(): void
    {
        $this->codes->send($this->student);
        $wrong = $this->emailedCode() === '000000' ? '111111' : '000000';

        foreach (range(1, PasswordResetCodes::MAX_ATTEMPTS) as $try) {
            try {
                $this->codes->verify('aisha@example.com', $wrong);
            } catch (ValidationException) {
                // Every wrong try is refused; the last one stops the code.
            }
        }

        $this->assertSame(['blocked'], $this->statuses());

        $this->travel(PasswordResetCodes::RESEND_SECONDS + 1)->seconds();
        $this->codes->send($this->student);
        $this->travel(PasswordResetCodes::CODE_MINUTES + 1)->minutes();

        $this->assertSame(['expired', 'blocked'], $this->statuses());
    }

    public function test_codes_older_than_two_hours_are_deleted(): void
    {
        $old = SentCode::factory()->create(['created_at' => now()->subHours(SentCode::KEEP_HOURS)->subMinute()]);
        $recent = SentCode::factory()->create();

        $this->artisan('model:prune', ['--model' => [SentCode::class]])->assertSuccessful();

        $this->assertModelMissing($old);
        $this->assertModelExists($recent);
    }
}
