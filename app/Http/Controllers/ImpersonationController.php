<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Academy;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ImpersonationController extends Controller
{
    /**
     * Session key holding the administrator who entered an academy.
     */
    public const SESSION_KEY = 'impersonator_id';

    /**
     * The administration enters an academy with the account of its manager, to see and do exactly
     * what the manager does there.
     */
    public function start(Request $request, Academy $academy): RedirectResponse
    {
        $this->authorize('impersonate', $academy);

        $manager = $academy->manager;

        if ($manager === null || ! $manager->is_active) {
            $this->toast(__('This academy has no active manager account. Add one from its edit page.'), 'error');

            return back();
        }

        $administratorId = $request->user()->id;

        Auth::guard('web')->login($manager);
        $request->session()->regenerate();
        $request->session()->put(self::SESSION_KEY, $administratorId);

        $this->toast(__('You are now inside :academy with the account of its manager.', ['academy' => $academy->name]), 'info');

        return redirect()->route('dashboard');
    }

    /**
     * Back to the administration account.
     */
    public function stop(Request $request): RedirectResponse
    {
        $administratorId = $request->session()->pull(self::SESSION_KEY);

        abort_if($administratorId === null, 403);

        $administrator = User::query()->whereKey($administratorId)->where('role', UserRole::Admin)->firstOrFail();
        $academyId = $request->user()?->academy_id;

        Auth::guard('web')->login($administrator);
        $request->session()->regenerate();

        return $academyId !== null ? redirect()->route('academies.show', $academyId) : redirect()->route('dashboard');
    }
}
