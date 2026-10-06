<?php

namespace App\Http\Controllers;

use App\Http\Requests\SpeechRequest;
use App\Services\Narrator;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class SpeechController extends Controller
{
    /**
     * A text read aloud by a man's voice (MP3), to listen to the tafsir and the stories. The same text
     * always gives the same file, so the browser keeps it.
     */
    public function __invoke(SpeechRequest $request, Narrator $narrator): BinaryFileResponse|JsonResponse
    {
        abort_unless($narrator->isConfigured(), 404);

        try {
            $path = $narrator->audio(Str::squish($request->validated('text')));
        } catch (ConnectionException|RequestException $exception) {
            report($exception);

            return response()->json(['message' => __('The voice is not available right now. Try again later.')], 503);
        }

        return response()->file($path, [
            'Content-Type' => 'audio/mpeg',
            'Cache-Control' => 'private, max-age=31536000, immutable',
        ]);
    }
}
