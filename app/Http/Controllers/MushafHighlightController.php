<?php

namespace App\Http\Controllers;

use App\Enums\HighlightColor;
use App\Models\Ayah;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

class MushafHighlightController extends Controller
{
    /**
     * Mark an ayah with a color (and an optional note), or change its mark.
     */
    public function update(Request $request, Ayah $ayah): JsonResponse
    {
        $validated = $request->validate([
            'color' => ['required', Rule::enum(HighlightColor::class)],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $highlight = $request->user()->mushafHighlights()->updateOrCreate(
            ['ayah_id' => $ayah->id],
            ['color' => $validated['color'], 'note' => $validated['note'] ?? null],
        );

        $highlight->setRelation('ayah', $ayah);

        return response()->json(['highlight' => $highlight->toReaderArray()]);
    }

    /**
     * Remove the mark of an ayah.
     */
    public function destroy(Request $request, Ayah $ayah): Response
    {
        $request->user()->mushafHighlights()->where('ayah_id', $ayah->id)->delete();

        return response()->noContent();
    }
}
