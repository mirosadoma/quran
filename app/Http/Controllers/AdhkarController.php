<?php

namespace App\Http\Controllers;

use App\Models\Dhikr;
use App\Models\DhikrCategory;
use App\Services\ContentCache;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdhkarController extends Controller
{
    public function __construct(protected ContentCache $cache) {}

    /**
     * Adhkar and duas grouped by category. The admin also sees the disabled ones to manage them.
     * Kept until the administration changes them (see ContentCache).
     */
    public function index(Request $request): Response
    {
        $canManage = $request->user()->isAdmin();

        return Inertia::render('adhkar/index', [
            'categories' => $this->cache->remember('adhkar', $canManage ? 'categories.all' : 'categories.active', fn (): array => DhikrCategory::query()
                ->when(! $canManage, fn (Builder $query) => $query->active())
                ->with(['adhkar' => fn (HasMany $query) => $canManage ? $query : $query->where('is_active', true)])
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->map(fn (DhikrCategory $category): array => $this->categoryArray($category))
                ->values()
                ->all()),
            'icons' => DhikrCategory::ICONS,
            'colors' => DhikrCategory::COLORS,
            'can' => ['manage' => $canManage],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function categoryArray(DhikrCategory $category): array
    {
        return [
            'id' => $category->id,
            'name' => $category->name,
            'slug' => $category->slug,
            'description' => $category->description,
            'icon' => $category->icon,
            'color' => $category->color,
            'sort_order' => $category->sort_order,
            'is_active' => $category->is_active,
            'adhkar' => $category->adhkar->map(fn (Dhikr $dhikr): array => [
                'id' => $dhikr->id,
                'dhikr_category_id' => $dhikr->dhikr_category_id,
                'title' => $dhikr->title,
                'text' => $dhikr->text,
                'repeat' => $dhikr->repeat,
                'reference' => $dhikr->reference,
                'virtue' => $dhikr->virtue,
                'sort_order' => $dhikr->sort_order,
                'is_active' => $dhikr->is_active,
            ])->values()->all(),
        ];
    }
}
