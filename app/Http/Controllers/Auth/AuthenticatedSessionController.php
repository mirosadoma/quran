<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\PushSubscription;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Show the login page.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('auth/login', [
            'status' => $request->session()->get('status'),
            'demoAccounts' => app()->environment('local') ? [
                ['role' => 'admin', 'login' => 'admin@rattil.test'],
                ['role' => 'teacher', 'login' => 'teacher@rattil.test'],
                ['role' => 'student', 'login' => 'student@rattil.test'],
            ] : [],
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = $request->user();
        $user->forceFill(['last_login_at' => now()])->saveQuietly();
        $request->session()->put('locale', $user->locale);

        return redirect()->intended(route('dashboard', absolute: false));
    }

    /**
     * Destroy an authenticated session. The device the user signs out from stops receiving
     * their push notifications.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $endpoint = $request->input('push_endpoint');

        if (is_string($endpoint) && $endpoint !== '') {
            $request->user()?->pushSubscriptions()->where('endpoint_hash', PushSubscription::hashEndpoint($endpoint))->delete();
        }

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }
}
