<?php

namespace App\Http\Middleware;

use App\Http\Controllers\ImpersonationController;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    /**
     * Sign out users whose account was deactivated by the admin, and the members of an academy
     * that was deactivated or archived (the administration may still look inside it).
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user === null) {
            return $next($request);
        }

        $academy = $user->academy_id !== null ? $user->academy : null;
        $academyClosed = $academy !== null && (! $academy->is_active || $academy->trashed());

        if (! $user->is_active || ($academyClosed && ! $request->session()->has(ImpersonationController::SESSION_KEY))) {
            Auth::guard('web')->logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->withErrors([
                'login' => $user->is_active
                    ? __('Your academy is not active at the moment. Please contact its administration.')
                    : __('Your account has been deactivated. Please contact the administration.'),
            ]);
        }

        return $next($request);
    }
}
