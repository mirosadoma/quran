<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * Texts read aloud by a man's voice (the tafsir and the stories): the speech service of the server
 * (transcriber/voice.mjs) makes the MP3, which is kept on disk so every text is made only once.
 */
class Narrator
{
    public function isConfigured(): bool
    {
        return filled(config('services.transcriber.url'));
    }

    /**
     * Path (on the local disk) of the MP3 of a text, made now when it is not kept yet.
     *
     * @throws ConnectionException
     * @throws RequestException
     */
    public function audio(string $text): string
    {
        $disk = Storage::disk('local');
        $path = 'speech/'.sha1($text).'.mp3';

        if (! $disk->exists($path)) {
            $config = config('services.transcriber');

            $disk->put($path, Http::when(filled($config['token']), fn (PendingRequest $request): PendingRequest => $request->withToken((string) $config['token']))
                ->timeout((int) $config['timeout'])
                ->post(rtrim((string) $config['url'], '/').'/speak', ['text' => $text])
                ->throw()
                ->body());
        }

        return $disk->path($path);
    }
}
