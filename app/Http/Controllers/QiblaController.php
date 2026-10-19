<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QiblaController extends Controller
{
    /**
     * The qibla compass: the direction of the Kaaba from the user's location.
     */
    public function __invoke(Request $request): Response
    {
        return Inertia::render('qibla/index', [
            'timezone' => $request->user()->displayTimezone(),
            'country' => $request->user()->country,
        ]);
    }
}
