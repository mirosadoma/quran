<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LocaleController extends Controller
{
    /**
     * Switch the interface language.
     */
    public function __invoke(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'locale' => ['required', Rule::in(config('app.supported_locales'))],
        ]);

        $request->session()->put('locale', $validated['locale']);
        $request->user()?->forceFill(['locale' => $validated['locale']])->saveQuietly();

        return back();
    }
}
