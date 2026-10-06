<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

/**
 * Speech to text with the diacritics, to check the vowels of a recitation (a fatha read as a kasra).
 * The model runs in a separate service on the server (transcriber/server.mjs): it receives the WAV
 * recording of a recited passage and answers with its text.
 */
class Transcriber
{
    public function isConfigured(): bool
    {
        return filled(config('services.transcriber.url'));
    }

    /**
     * The text of a WAV recording, with its diacritics. A partial recording (the passage so far, while
     * the reader speaks) is refused at once by the service when it is busy, and waits less.
     *
     * @throws ConnectionException
     * @throws RequestException
     */
    public function transcribe(string $wav, bool $partial = false): string
    {
        $config = config('services.transcriber');

        return trim((string) Http::withBody($wav, 'audio/wav')
            ->when(filled($config['token']), fn (PendingRequest $request): PendingRequest => $request->withToken((string) $config['token']))
            ->acceptJson()
            ->timeout($partial ? min(10, (int) $config['timeout']) : (int) $config['timeout'])
            ->post(rtrim((string) $config['url'], '/').'/transcribe'.($partial ? '?partial=1' : ''))
            ->throw()
            ->json('text'));
    }
}
