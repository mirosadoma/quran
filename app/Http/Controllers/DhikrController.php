<?php

namespace App\Http\Controllers;

use App\Http\Requests\DhikrRequest;
use App\Models\Dhikr;
use Illuminate\Http\RedirectResponse;

class DhikrController extends Controller
{
    /**
     * Add a dhikr or dua to a category.
     */
    public function store(DhikrRequest $request): RedirectResponse
    {
        $categoryId = $request->integer('dhikr_category_id');

        Dhikr::query()->create([
            ...$request->validated(),
            'sort_order' => $request->filled('sort_order')
                ? $request->integer('sort_order')
                : ((int) Dhikr::query()->where('dhikr_category_id', $categoryId)->max('sort_order')) + 1,
            'is_active' => $request->boolean('is_active', true),
        ]);

        $this->toast(__('Dhikr added.'));

        return back();
    }

    /**
     * Update a dhikr.
     */
    public function update(DhikrRequest $request, Dhikr $dhikr): RedirectResponse
    {
        $dhikr->update([
            ...$request->validated(),
            'sort_order' => $request->filled('sort_order') ? $request->integer('sort_order') : $dhikr->sort_order,
            'is_active' => $request->boolean('is_active', $dhikr->is_active),
        ]);

        $this->toast(__('Dhikr updated.'));

        return back();
    }

    /**
     * Show or hide a dhikr for everyone.
     */
    public function toggle(Dhikr $dhikr): RedirectResponse
    {
        $dhikr->update(['is_active' => ! $dhikr->is_active]);

        $this->toast($dhikr->is_active ? __('Dhikr enabled.') : __('Dhikr disabled.'));

        return back();
    }

    /**
     * Delete a dhikr.
     */
    public function destroy(Dhikr $dhikr): RedirectResponse
    {
        $dhikr->delete();

        $this->toast(__('Dhikr deleted.'));

        return back();
    }
}
