<?php

namespace App\Http\Controllers;

use App\Models\PushSubscription;
use App\Notifications\TestPushNotification;
use App\Services\Firebase\CloudMessaging;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class PushSubscriptionController extends Controller
{
    /**
     * Remember this browser (or installed app) by its Firebase token to push the user's
     * notifications to it.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string', 'max:2000', 'regex:/^[\w:-]+$/'],
        ]);

        PushSubscription::query()->updateOrCreate(
            ['token_hash' => PushSubscription::hashToken($validated['token'])],
            [
                'user_id' => $request->user()->id,
                'token' => $validated['token'],
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
        $validated = $request->validate(['token' => ['required', 'string', 'max:2000']]);

        $request->user()->pushSubscriptions()->where('token_hash', PushSubscription::hashToken($validated['token']))->delete();

        return response()->noContent();
    }

    /**
     * Send a test notification to the user's devices right away (not through the queue), and
     * tell how many of them Firebase accepted it for.
     */
    public function test(Request $request, CloudMessaging $messaging): JsonResponse
    {
        abort_unless($messaging->isConfigured(), 422, __('Push notifications are not configured.'));

        $startedAt = now()->startOfSecond();

        $request->user()->notifyNow(new TestPushNotification);

        return response()->json([
            'devices' => $request->user()->pushSubscriptions()->count(),
            'delivered' => $request->user()->pushSubscriptions()->where('last_used_at', '>=', $startedAt)->count(),
        ]);
    }
}
