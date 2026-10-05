<?php

namespace App\Services;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Notification as NotificationFacade;

/**
 * Sends notifications without letting a delivery failure (mail server,
 * WhatsApp, realtime) break the user's request.
 */
class Notifier
{
    /**
     * @param  mixed  $notifiables  A notifiable, an array or a collection of them.
     */
    public function send(mixed $notifiables, Notification $notification): void
    {
        $notifiables = Collection::wrap($notifiables)->filter()->values();

        if ($notifiables->isEmpty()) {
            return;
        }

        rescue(fn () => NotificationFacade::send($notifiables, $notification));
    }
}
