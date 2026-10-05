<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileRequest;
use DateTimeZone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the profile form.
     */
    public function edit(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('profile/edit', [
            'profile' => [
                'name' => $user->name,
                'email' => $user->email,
                'phone' => $user->phone,
                'role' => $user->role->value,
                'gender' => $user->gender?->value,
                'birth_date' => $user->birth_date?->toDateString(),
                'country' => $user->country,
                'timezone' => $user->timezone,
                'locale' => $user->locale,
                'bio' => $user->bio,
                'guardian_name' => $user->guardian_name,
                'guardian_phone' => $user->guardian_phone,
                'notify_email' => $user->notify_email,
                'notify_whatsapp' => $user->notify_whatsapp,
                'avatar_url' => $user->avatar_url,
            ],
            'timezones' => DateTimeZone::listIdentifiers(),
        ]);
    }

    /**
     * Update the profile.
     */
    public function update(ProfileRequest $request): RedirectResponse
    {
        $user = $request->user();

        $user->fill($request->safe()->except(['avatar', 'remove_avatar']));
        $user->updateAvatar($request->file('avatar'), $request->boolean('remove_avatar'));
        $user->save();

        $request->session()->put('locale', $user->locale);

        $this->toast(__('Profile updated.'));

        return back();
    }

    /**
     * Change the password.
     */
    public function password(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $request->user()->update(['password' => $validated['password']]);

        $this->toast(__('Password changed.'));

        return back();
    }
}
