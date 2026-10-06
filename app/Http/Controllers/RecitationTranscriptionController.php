<?php

namespace App\Http\Controllers;

use App\Http\Requests\RecitationAudioRequest;
use App\Services\Transcriber;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;

class RecitationTranscriptionController extends Controller
{
    /**
     * The text, with its diacritics, of a passage recited aloud (to check its vowels in the mushaf and
     * kids memorization). A partial passage (still being read) is skipped when the service is busy.
     */
    public function __invoke(RecitationAudioRequest $request, Transcriber $transcriber): JsonResponse
    {
        abort_unless($transcriber->isConfigured(), 404);

        $partial = $request->boolean('partial');

        try {
            $text = $transcriber->transcribe($request->file('audio')->get(), $partial);
        } catch (ConnectionException|RequestException $exception) {
            if (! $partial) {
                report($exception);
            }

            return response()->json(['message' => __('The vowel check is not available right now. Try again later.')], 503);
        }

        return response()->json(['text' => $text]);
    }
}
