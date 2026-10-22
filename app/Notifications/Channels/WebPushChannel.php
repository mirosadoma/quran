<?php

namespace App\Notifications\Channels;

use App\Models\PushSubscription;
use App\Services\Firebase\CloudMessaging;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Pushes a notification to every browser and installed app of the user through Firebase,
 * even when the platform is closed. Devices Firebase no longer knows are removed.
 */
class WebPushChannel
{
    public function __construct(protected CloudMessaging $messaging) {}

    /**
     * Send the given notification.
     */
    public function send(object $notifiable, Notification $notification): void
    {
        if (! $this->messaging->isConfigured() || ! method_exists($notification, 'toWebPush') || ! method_exists($notifiable, 'pushSubscriptions')) {
            return;
        }

        $payload = $notification->toWebPush($notifiable);

        foreach ($notifiable->pushSubscriptions()->get() as $subscription) {
            $this->deliver($subscription, $payload);
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    protected function deliver(PushSubscription $subscription, array $payload): void
    {
        try {
            $response = $this->messaging->send($subscription, $payload);
        } catch (Throwable $exception) {
            report($exception);

            return;
        }

        if ($response->successful()) {
            $subscription->forceFill(['last_used_at' => now()])->saveQuietly();
        } elseif ($this->messaging->isStaleToken($response)) {
            $subscription->delete();
        } else {
            Log::warning('Firebase refused a push notification.', [
                'status' => $response->status(),
                'error' => $response->json('error.message'),
            ]);
        }
    }
}
