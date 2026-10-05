<?php

namespace App\Notifications\Channels;

use App\Models\PushSubscription;
use App\Services\WebPush\WebPush;
use Illuminate\Notifications\Notification;
use Throwable;

/**
 * Pushes a notification to every browser and installed app of the user, even when the
 * platform is closed. Subscriptions the push service no longer knows are removed.
 */
class WebPushChannel
{
    public function __construct(protected WebPush $push) {}

    /**
     * Send the given notification.
     */
    public function send(object $notifiable, Notification $notification): void
    {
        if (! $this->push->isConfigured() || ! method_exists($notification, 'toWebPush') || ! method_exists($notifiable, 'pushSubscriptions')) {
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
            $status = $this->push->send($subscription, $payload)->status();
        } catch (Throwable $exception) {
            report($exception);

            return;
        }

        if (in_array($status, [404, 410], true)) {
            $subscription->delete();
        } elseif ($status < 300) {
            $subscription->forceFill(['last_used_at' => now()])->saveQuietly();
        }
    }
}
