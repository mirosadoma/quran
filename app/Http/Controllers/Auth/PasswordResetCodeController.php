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
     * A code sent less than a minute ago stays valid and is not sent again. When the email cannot leave, the code
     * page still opens: the administration can give the code (sent codes page).
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

        $sent = $this->codes->resendAt($email) !== null || $this->send($user);

        $request->session()->put(self::SESSION_KEY, $email);

        return $this->afterSending(redirect()->route('password.code'), $sent, __('We sent the code to your email.'));
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
            'warning' => $request->session()->get('warning'),
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

        return $this->afterSending(back(), $this->send($user), __('A new code has been sent.'));
    }

    /**
     * Send the code; false when the email could not leave (the outgoing email is not set up or is down).
     */
    protected function send(User $user): bool
    {
        try {
            $this->codes->send($user);

            return true;
        } catch (Throwable $exception) {
            report($exception);

            return false;
        }
    }

    /**
     * Tell the user the code was sent, or that the administration can give it when the email could not leave.
     */
    protected function afterSending(RedirectResponse $redirect, bool $sent, string $status): RedirectResponse
    {
        return $sent
            ? $redirect->with('status', $status)
            : $redirect->with('warning', __('The email could not be sent now. Contact the administration: they can give you the code.'));
    }
}
