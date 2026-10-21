<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\PasswordResetCodes;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

/**
 * "Forgot your password?": the email of the account, then the code (OTP) sent to it, then the new password
 * (NewPasswordController, with the reset token made once the code is right).
 */
class PasswordResetCodeController extends Controller
{
    /**
     * The email being reset, kept in the session between the steps.
     */
    public const SESSION_KEY = 'password_reset_email';

    public function __construct(protected PasswordResetCodes $codes) {}

    /**
     * Show the page that asks for the email.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/forgot-password', [
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Send the code to the email and go to the page of the code; an email without account is told so at once.
     * A code sent less than a minute ago stays valid and is not sent again.
     *
     * @throws ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $email = $this->codes->normalize((string) $request->input('email'));
        $user = $this->codes->accountOf($email);

        if ($user === null) {
            throw ValidationException::withMessages(['email' => __('passwords.user')]);
        }

        if ($this->codes->resendAt($email) === null) {
            $this->send($user, 'email');
        }

        $request->session()->put(self::SESSION_KEY, $email);

        return redirect()->route('password.code')
            ->with('status', __('We sent the code to your email.'));
    }

    /**
     * Show the page that asks for the code.
     */
    public function code(Request $request): Response|RedirectResponse
    {
        $email = $request->session()->get(self::SESSION_KEY);

        if ($email === null) {
            return redirect()->route('password.request');
        }

        return Inertia::render('auth/reset-code', [
            'email' => $email,
            'status' => $request->session()->get('status'),
            'resendAt' => $this->codes->resendAt($email)?->toIso8601String(),
            'minutes' => PasswordResetCodes::CODE_MINUTES,
        ]);
    }

    /**
     * Check the code, then open the page of the new password.
     *
     * @throws ValidationException
     */
    public function verify(Request $request): RedirectResponse
    {
        $email = $request->session()->get(self::SESSION_KEY);

        if ($email === null) {
            return redirect()->route('password.request');
        }

        $request->validate([
            'code' => ['required', 'digits:6'],
        ]);

        $user = $this->codes->verify($email, (string) $request->input('code'));

        $request->session()->forget(self::SESSION_KEY);

        return redirect()->route('password.reset', [
            'token' => Password::broker()->createToken($user),
            'email' => $user->email,
        ]);
    }

    /**
     * Send a new code (the previous one stops working).
     *
     * @throws ValidationException
     */
    public function resend(Request $request): RedirectResponse
    {
        $email = $request->session()->get(self::SESSION_KEY);
        $user = $email === null ? null : $this->codes->accountOf($email);

        if ($user === null) {
            return redirect()->route('password.request');
        }

        if ($resendAt = $this->codes->resendAt($email)) {
            throw ValidationException::withMessages([
                'code' => __('Wait :seconds seconds before asking for a new code.', ['seconds' => (int) ceil(now()->diffInSeconds($resendAt))]),
            ]);
        }

        $this->send($user, 'code');

        return back()->with('status', __('A new code has been sent.'));
    }

    /**
     * Send the code, and tell the user when the email could not leave (the outgoing email is not set up).
     *
     * @throws ValidationException
     */
    protected function send(User $user, string $field): void
    {
        try {
            $this->codes->send($user);
        } catch (Throwable $exception) {
            report($exception);

            throw ValidationException::withMessages([
                $field => __('The code could not be sent now. Try again later or contact the administration.'),
            ]);
        }
    }
}
