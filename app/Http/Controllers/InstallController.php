<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Inertia\Response;

class InstallController extends Controller
{
    /**
     * The page to share to install the app: anyone who opens the link can install it right away.
     */
    public function __invoke(): Response
    {
        return Inertia::render('install');
    }
}
