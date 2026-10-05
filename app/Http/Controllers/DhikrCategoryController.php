<?php

namespace App\Http\Controllers;

use App\Http\Requests\DhikrCategoryRequest;
use App\Models\DhikrCategory;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;

class DhikrCategoryController extends Controller
{
    /**
     * Add a category of adhkar.
     */
    public function store(DhikrCategoryRequest $request): RedirectResponse
    {
        DhikrCategory::query()->create([
            ...$request->validated(),
            'slug' => $this->uniqueSlug($request->string('name')->toString()),
            'sort_order' => $request->filled('sort_order') ? $request->integer('sort_order') : ((int) DhikrCategory::query()->max('sort_order')) + 1,
            'is_active' => $request->boolean('is_active', true),
        ]);

        $this->toast(__('Category added.'));

        return back();
    }

    /**
     * Update a category.
     */
    public function update(DhikrCategoryRequest $request, DhikrCategory $category): RedirectResponse
    {
        $category->update([
            ...$request->validated(),
            'sort_order' => $request->filled('sort_order') ? $request->integer('sort_order') : $category->sort_order,
            'is_active' => $request->boolean('is_active', $category->is_active),
        ]);

        $this->toast(__('Category updated.'));

        return back();
    }

    /**
     * Show or hide a category (with its adhkar) for everyone.
     */
    public function toggle(DhikrCategory $category): RedirectResponse
    {
        $category->update(['is_active' => ! $category->is_active]);

        $this->toast($category->is_active ? __('Category enabled.') : __('Category disabled.'));

        return back();
    }

    /**
     * Delete a category with its adhkar.
     */
    public function destroy(DhikrCategory $category): RedirectResponse
    {
        $category->delete();

        $this->toast(__('Category deleted.'));

        return back();
    }

    protected function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'adhkar';
        $slug = $base;

        while (DhikrCategory::query()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.Str::lower(Str::random(5));
        }

        return $slug;
    }
}
