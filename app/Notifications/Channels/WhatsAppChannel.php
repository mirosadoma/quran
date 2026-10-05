<?php

namespace App\Notifications\Channels;

use App\Services\WhatsApp\WhatsAppClient;
use Illuminate\Notifications\Notification;

class WhatsAppChannel
{
    public function __construct(protected WhatsAppClient $client) {}

    /**
     * Send the given notification.
     */
    public function send(object $notifiable, Notification $notification): void
    {
        $to = $notifiable->routeNotificationFor('whatsapp', $notification);

        if (blank($to) || ! method_exists($notification, 'toWhatsApp')) {
            return;
        }

        $this->client->send((string) $to, $notification->toWhatsApp($notifiable));
    }
}
