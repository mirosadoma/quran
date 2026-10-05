<?php

namespace App\Notifications;

use App\Models\HalaqaSession;

class SessionStarted extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public HalaqaSession $session) {}

    public function title(object $notifiable): string
    {
        return __('The session has started');
    }

    public function body(object $notifiable): string
    {
        return __(':teacher started :title. Join now!', [
            'teacher' => $this->session->teacher?->name ?? __('The teacher'),
            'title' => $this->session->displayTitle(),
        ]);
    }

    public function url(): ?string
    {
        return route('sessions.show', $this->session);
    }

    public function icon(): string
    {
        return 'video';
    }

    public function sendsMail(): bool
    {
        return false;
    }

    public function whatsAppTemplate(): ?string
    {
        return 'session_started';
    }
}
