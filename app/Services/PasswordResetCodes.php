<?php

namespace App\Services;

use App\Enums\CodePurpose;
use App\Models\SentCode;
use App\Models\User;
use App\Notifications\PasswordResetCode;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * The codes (OTP) that let a user who forgot the password choose a new one: six digits sent by email, valid for
 * CODE_MINUTES, refused after MAX_ATTEMPTS wrong tries, and sent again at most every RESEND_SECONDS. One code per
 * email, kept hashed in the cache; a new code replaces the previous one. A copy is also kept encrypted for two hours
 * (SentCode) so the administration can give it when the email does not arrive.
 */
class PasswordResetCodes
{
    public const CODE_MINUTES = 15;

    public const MAX_ATTEMPTS = 5;

    public const RESEND_SECONDS = 60;

    /**
     * The same email whatever its letter case.
     */
    public function normalize(string $email): string
    {
        return strtolower(trim($email));
    }

    /**
     * When a new code may be sent to this email, or null when it may be sent now.
     */
    public function resendAt(string $email): ?Carbon
    {
        $sentAt = Cache::get($this->key('sent', $email));

        if ($sentAt === null) {
            return null;
        }

        $at = Carbon::createFromTimestamp($sentAt)->addSeconds(self::RESEND_SECONDS);

        return $at->isFuture() ? $at : null;
    }

    /**
     * The account that uses the email, if any.
     */
    public function accountOf(string $email): ?User
    {
        return User::query()->where('email', $this->normalize($email))->first();
    }

    /**
     * Send a new code to the email of the account.
     */
    public function send(User $user): void
    {
        $email = (string) $user->email;

        Cache::put($this->key('sent', $email), now()->getTimestamp(), self::RESEND_SECONDS);

        $code = str_pad((string) random_int(0, 999_999), 6, '0', STR_PAD_LEFT);

        $expiresAt = now()->addMinutes(self::CODE_MINUTES);

        $sent = SentCode::query()->create([
            'user_id' => $user->id,
            'purpose' => CodePurpose::PasswordReset,
            'channel' => 'email',
            'destination' => $email,
            'code' => $code,
            'expires_at' => $expiresAt,
        ]);

        Cache::put(
            $this->key('code', $email),
            ['hash' => Hash::make($code), 'attempts' => 0, 'expires_at' => $expiresAt->getTimestamp(), 'sent_code_id' => $sent->id],
            $expiresAt,
        );

        $user->notify(new PasswordResetCode($code, self::CODE_MINUTES));
    }

    /**
     * The account of the email when the code is right. A right code works once; a wrong one counts as a try.
     *
     * @throws ValidationException
     */
    public function verify(string $email, string $code): User
    {
        $key = $this->key('code', $email);
        $entry = Cache::get($key);

        if ($entry === null) {
            throw ValidationException::withMessages(['code' => __('The code expired or is used: ask for a new code.')]);
        }

        if (! Hash::check($code, $entry['hash'])) {
            $attempts = $entry['attempts'] + 1;

            if ($attempts >= self::MAX_ATTEMPTS) {
                Cache::forget($key);
                $this->markSentCode($entry, 'blocked_at');

                throw ValidationException::withMessages(['code' => __('Too many wrong tries: ask for a new code.')]);
            }

            // A wrong try keeps the time the code has left.
            Cache::put($key, [...$entry, 'attempts' => $attempts], Carbon::createFromTimestamp($entry['expires_at']));

            throw ValidationException::withMessages(['code' => __('The code is wrong. Tries left: :count.', ['count' => self::MAX_ATTEMPTS - $attempts])]);
        }

        Cache::forget($key);
        $this->markSentCode($entry, 'used_at');

        $user = $this->accountOf($email);

        if ($user === null) {
            throw ValidationException::withMessages(['code' => __('The code expired or is used: ask for a new code.')]);
        }

        return $user;
    }

    /**
     * Note on the administration's copy that the code was used, or stopped working.
     *
     * @param  array{sent_code_id?: int}  $entry
     */
    protected function markSentCode(array $entry, string $column): void
    {
        if (isset($entry['sent_code_id'])) {
            SentCode::query()->whereKey($entry['sent_code_id'])->update([$column => now()]);
        }
    }

    protected function key(string $kind, string $email): string
    {
        return "password-reset-code:{$kind}:".hash('sha256', $this->normalize($email));
    }
}
