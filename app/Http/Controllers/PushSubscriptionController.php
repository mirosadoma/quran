<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use App\Notifications\TestPushNotification;
use App\Services\WebPush\WebPush;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class PushSubscriptionController extends Controller
{
    /**
     * Remember this browser (or installed app) to push the user's notifications to it.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'endpoint' => ['required', 'string', 'url', 'starts_with:https://', 'max:2000'],
            'keys.p256dh' => ['required', 'string', 'max:120'],
            'keys.auth' => ['required', 'string', 'max:60'],
        ]);

        PushSubscription::query()->updateOrCreate(
            ['endpoint_hash' => PushSubscription::hashEndpoint($validated['endpoint'])],
            [
                'user_id' => $request->user()->id,
                'endpoint' => $validated['endpoint'],
                'public_key' => $validated['keys']['p256dh'],
                'auth_token' => $validated['keys']['auth'],
                'user_agent' => Str::limit((string) $request->userAgent(), 250, ''),
            ],
        );

        return response()->json(['subscribed' => true], 201);
    }

    /**
     * Stop pushing notifications to this browser.
     */
    public function destroy(Request $request): Response
    {
        $validated = $request->validate(['endpoint' => ['required', 'string', 'max:2000']]);

        $request->user()->pushSubscriptions()->where('endpoint_hash', PushSubscription::hashEndpoint($validated['endpoint']))->delete();

        return response()->noContent();
    }

    /**
     * Send a test notification to the user's devices.
     */
    public function test(Request $request, WebPush $push): JsonResponse
    {
        abort_unless($push->isConfigured(), 422, __('Push notifications are not configured.'));

        $request->user()->notify(new TestPushNotification);

        return response()->json(['devices' => $request->user()->pushSubscriptions()->count()]);
    }
}
