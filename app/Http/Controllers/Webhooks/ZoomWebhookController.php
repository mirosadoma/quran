<?php

namespace App\Http\Controllers\Webhooks;

use App\Enums\MeetingProvider;
use App\Http\Controllers\Controller;
use App\Models\HalaqaSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ZoomWebhookController extends Controller
{
    /**
     * Receive Zoom events (endpoint validation and cloud recordings).
     */
    public function __invoke(Request $request): JsonResponse
    {
        $secret = (string) config('services.zoom.webhook_secret');

        abort_if($secret === '', 404);

        if ($request->input('event') === 'endpoint.url_validation') {
            $plainToken = (string) $request->input('payload.plainToken');

            return response()->json([
                'plainToken' => $plainToken,
                'encryptedToken' => hash_hmac('sha256', $plainToken, $secret),
            ]);
        }

        $timestamp = (string) $request->header('x-zm-request-timestamp');
        $expected = 'v0='.hash_hmac('sha256', "v0:{$timestamp}:{$request->getContent()}", $secret);

        abort_unless(hash_equals($expected, (string) $request->header('x-zm-signature')), 401);

        if ($request->input('event') === 'recording.completed') {
            $session = HalaqaSession::query()
                ->where('meeting_provider', MeetingProvider::Zoom)
                ->where('meeting_id', (string) $request->input('payload.object.id'))
                ->latest('starts_at')
                ->first();

            if ($session !== null && filled($request->input('payload.object.share_url'))) {
                $session->update([
                    'recording_url' => $request->input('payload.object.share_url'),
                    'meeting_data' => [
                        ...($session->meeting_data ?? []),
                        'recording_passcode' => $request->input('payload.object.recording_play_passcode')
                            ?? $request->input('payload.object.password'),
                    ],
                ]);
            }
        }

        return response()->json(['received' => true]);
    }
}
