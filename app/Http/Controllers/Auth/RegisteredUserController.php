<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\RegisterRequest;
use App\Models\Academy;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Anyone can open a personal account: the mushaf, adhkar, prayer and self-accounting right away,
 * and an academy to join whenever they want.
 */
class RegisteredUserController extends Controller
{
    public function create(Request $request): Response
    {
        $academy = $request->filled('academy')
            ? Academy::query()->open()->where('slug', $request->query('academy'))->first(['id', 'name', 'slug'])
            : null;

        return Inertia::render('auth/register', [
            'academy' => $academy?->only(['name', 'slug']),
        ]);
    }

    public function store(RegisterRequest $request): RedirectResponse
    {
        $user = User::query()->create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'phone' => $request->validated('phone'),
            'gender' => $request->validated('gender'),
            'password' => $request->validated('password'),
            'role' => UserRole::Student,
            'timezone' => Setting::get('default_timezone'),
            'locale' => app()->getLocale(),
            'is_active' => true,
        ]);

        Auth::login($user);
        $request->session()->regenerate();
        $user->forceFill(['last_login_at' => now()])->saveQuietly();

        $this->toast(__('Welcome, :name! Your account is ready.', ['name' => $user->name]));

        // Came from an academy's page: continue with the request to join it.
        if ($request->filled('academy')) {
            return redirect()->route('my-academy', ['join' => $request->validated('academy')]);
        }

        return redirect()->route('dashboard');
    }
}
