<?php

namespace App\Http\Controllers;

use App\Models\Ayah;
use App\Models\Reciter;
use App\Services\Transcriber;
use Inertia\Inertia;
use Inertia\Response;

class KidsController extends Controller
{
    /**
     * Memorizing for children: a surah ayah by ayah, listening to a sheikh and reciting aloud.
     */
    public function __invoke(Transcriber $transcriber): Response
    {
        return Inertia::render('kids/index', [
            'ready' => Ayah::query()->exists(),
            'reciters' => Reciter::query()->available()->get()->map(fn (Reciter $reciter): array => $reciter->toPlayerArray())->values(),
            'vowelCheck' => $transcriber->isConfigured(),
        ]);
    }
}
