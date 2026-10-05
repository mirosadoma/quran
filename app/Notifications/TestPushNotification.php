<?php

namespace App\Notifications;

use App\Models\Setting;
use App\Notifications\Channels\WebPushChannel;

/**
 * Lets a user check that push notifications reach their devices.
 */
class TestPushNotification extends AppNotification
{
    public function title(object $notifiable): string
    {
        return __('Notifications are working');
    }

    public function body(object $notifiable): string
    {
        return __('This device will receive the notifications of :app even when it is closed.', ['app' => Setting::get('academy_name')]);
    }

    public function url(): ?string
    {
        return route('dashboard', absolute: false);
    }

    /**
     * Pushed only: it is not kept in the notifications list.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return [WebPushChannel::class];
    }

    /**
     * @return array<string, mixed>
     */
    public function toWebPush(object $notifiable): array
    {
        return [...parent::toWebPush($notifiable), 'url' => $this->url(), 'tag' => 'test'];
    }
}
