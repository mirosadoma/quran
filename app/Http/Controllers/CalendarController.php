<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class CalendarController extends Controller
{
    /**
     * The Gregorian and Hijri calendar with the Islamic occasions and the national holidays.
     */
    public function __invoke(Request $request): Response
    {
        return Inertia::render('calendar/index', [
            'timezone' => $request->user()->displayTimezone(),
            'country' => $request->user()->country,
        ]);
    }
}
