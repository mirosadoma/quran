<?php

namespace App\Http\Controllers;

use App\Models\SunnahCategory;
use App\Services\ContentCache;
use Inertia\Inertia;
use Inertia\Response;

class SunnahController extends Controller
{
    /**
     * The neglected sunnahs by category, each with how it is done and its hadith.
     */
    public function __invoke(ContentCache $cache): Response
    {
        return Inertia::render('sunnahs/index', [
            'categories' => $cache->remember('sunnahs', 'categories', fn (): array => SunnahCategory::query()
                ->ordered()
                ->with('sunnahs')
                ->get()
                ->map(fn (SunnahCategory $category): array => $category->toPageArray())
                ->values()
                ->all()),
        ]);
    }
}
