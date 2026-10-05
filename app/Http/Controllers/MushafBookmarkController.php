<?php

namespace App\Http\Controllers;

use App\Models\Ayah;
use App\Models\MushafBookmark;
use App\Services\Mushaf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class MushafBookmarkController extends Controller
{
    /**
     * Bookmark a page, or an ayah on it.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'page' => ['required', 'integer', 'between:1,'.Mushaf::PAGES],
            'ayah_id' => ['nullable', 'integer', 'exists:ayahs,id'],
            'label' => ['nullable', 'string', 'max:120'],
        ]);

        $ayah = isset($validated['ayah_id']) ? Ayah::query()->find($validated['ayah_id']) : null;

        $bookmark = $request->user()->mushafBookmarks()->updateOrCreate(
            ['page' => $ayah?->page ?? $validated['page'], 'ayah_id' => $ayah?->id],
            ['label' => $validated['label'] ?? null],
        );

        $bookmark->setRelation('ayah', $ayah);

        return response()->json(['bookmark' => $bookmark->toReaderArray()], 201);
    }

    /**
     * Remove a bookmark.
     */
    public function destroy(MushafBookmark $bookmark): Response
    {
        $this->authorize('delete', $bookmark);

        $bookmark->delete();

        return response()->noContent();
    }
}
