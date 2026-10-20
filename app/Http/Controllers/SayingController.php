<?php

namespace App\Http\Controllers;

use App\Models\SayingCategory;
use Inertia\Inertia;
use Inertia\Response;

class SayingController extends Controller
{
    /**
     * The transmitted sayings and stories by category, each with who said it and its lesson.
     */
    public function __invoke(): Response
    {
        return Inertia::render('sayings/index', [
            'categories' => SayingCategory::query()
                ->ordered()
                ->with('sayings')
                ->get()
                ->map(fn (SayingCategory $category): array => $category->toPageArray())
                ->values(),
        ]);
    }
}
