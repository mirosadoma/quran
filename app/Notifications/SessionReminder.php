<?php

namespace App\Notifications;

use App\Models\HalaqaSession;

class SessionReminder extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public HalaqaSession $session) {}

    public function title(object $notifiable): string
    {
        return __('Your session starts soon');
    }

    public function body(object $notifiable): string
    {
        return __(':title starts at :time. Get ready!', [
            'title' => $this->session->displayTitle(),
            'time' => $this->formatTime($this->session->starts_at, $notifiable),
        ]);
    }

    public function url(): ?string
    {
        return route('sessions.show', $this->session);
    }

    public function icon(): string
    {
        return 'alarm-clock';
    }

    public function color(): string
    {
        return 'gold';
    }

    public function whatsAppTemplate(): ?string
    {
        return 'session_reminder';
    }
}
