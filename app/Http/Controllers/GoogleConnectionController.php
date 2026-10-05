<?php

namespace App\Http\Controllers;

use App\Exceptions\MeetingException;
use App\Services\Meetings\GoogleClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class GoogleConnectionController extends Controller
{
    public function __construct(protected GoogleClient $google) {}

    /**
     * Send the admin to Google to authorize the academy account.
     */
    public function redirect(Request $request): RedirectResponse
    {
        if (! $this->google->hasCredentials()) {
            $this->toast(__('Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the .env file first.'), 'error');

            return redirect()->route('settings.edit');
        }

        $state = Str::random(40);
        $request->session()->put('google_oauth_state', $state);

        return redirect()->away($this->google->authorizationUrl($state));
    }

    /**
     * Handle the response from Google.
     */
    public function callback(Request $request): RedirectResponse
    {
        $expected = (string) $request->session()->pull('google_oauth_state');

        if ($expected === '' || ! hash_equals($expected, (string) $request->query('state'))) {
            $this->toast(__('The Google connection request expired. Please try again.'), 'error');

            return redirect()->route('settings.edit');
        }

        if ($request->filled('error') || ! $request->filled('code')) {
            $this->toast(__('The Google connection was cancelled.'), 'error');

            return redirect()->route('settings.edit');
        }

        try {
            $email = $this->google->connect((string) $request->query('code'));
            $this->toast(__('Google account connected: :email', ['email' => $email ?? '-']));
        } catch (MeetingException $exception) {
            $this->toast($exception->getMessage(), 'error');
        }

        return redirect()->route('settings.edit');
    }

    /**
     * Disconnect the Google account.
     */
    public function destroy(): RedirectResponse
    {
        $this->google->disconnect();

        $this->toast(__('Google account disconnected.'));

        return back();
    }
}
