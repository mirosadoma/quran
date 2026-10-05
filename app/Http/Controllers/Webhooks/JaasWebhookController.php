<?php

namespace App\Http\Controllers\Webhooks;

use App\Enums\MeetingProvider;
use App\Http\Controllers\Controller;
use App\Jobs\DownloadRecording;
use App\Models\HalaqaSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class JaasWebhookController extends Controller
{
    /**
     * Receive 8x8 JaaS events and store uploaded recordings.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $secret = (string) config('meetings.jitsi.jaas.webhook_secret');

        abort_if($secret === '', 404);
        abort_unless($this->hasValidSignature($request, $secret), 401);

        if ($request->input('eventType') === 'RECORDING_UPLOADED') {
            $room = Str::lower(Str::afterLast((string) $request->input('fqn'), '/'));
            $link = $request->input('data.preAuthenticatedLink');

            $session = HalaqaSession::query()
                ->where('meeting_provider', MeetingProvider::Jitsi)
                ->where('meeting_id', $room)
                ->first();

            if ($session !== null && filled($link)) {
                DownloadRecording::dispatch($session, (string) $link);
            }
        }

        return response()->json(['received' => true]);
    }

    /**
     * Check the "X-Jaas-Signature: t=...,v1=..." header (HMAC-SHA256, base64).
     */
    protected function hasValidSignature(Request $request, string $secret): bool
    {
        $header = (string) $request->header('X-Jaas-Signature');

        preg_match('/t=([^,]+)/', $header, $timestamp);
        preg_match('/v1=([^,]+)/', $header, $signature);

        if (! isset($timestamp[1], $signature[1])) {
            return false;
        }

        $expected = base64_encode(hash_hmac('sha256', $timestamp[1].'.'.$request->getContent(), $secret, true));

        return hash_equals($expected, $signature[1]);
    }
}
