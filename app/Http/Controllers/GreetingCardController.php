<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GreetingCardController extends Controller
{
    /**
     * Greeting cards for the Islamic occasions, with the user's photo inside the design.
     */
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('cards/index', [
            'defaults' => [
                'name' => $user->name,
                'avatar_url' => $user->avatar_url,
                'academy' => $user->academy_id !== null && $user->academy ? [
                    'name' => $user->academy->name,
                    'logo_url' => $user->academy->logo_url,
                ] : null,
            ],
        ]);
    }
}
