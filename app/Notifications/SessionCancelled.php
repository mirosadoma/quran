<?php

namespace App\Notifications;

use App\Models\HalaqaSession;

class SessionCancelled extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public HalaqaSession $session) {}

    public function title(object $notifiable): string
    {
        return __('Session cancelled');
    }

    public function body(object $notifiable): string
    {
        $body = __('The session :title on :time was cancelled.', [
            'title' => $this->session->displayTitle(),
            'time' => $this->formatTime($this->session->starts_at, $notifiable),
        ]);

        if (filled($this->session->cancel_reason)) {
            $body .= ' '.__('Reason: :reason', ['reason' => $this->session->cancel_reason]);
        }

        return $body;
    }

    public function url(): ?string
    {
        return route('sessions.show', $this->session);
    }

    public function icon(): string
    {
        return 'calendar-x';
    }

    public function color(): string
    {
        return 'rose';
    }

    public function whatsAppTemplate(): ?string
    {
        return 'session_cancelled';
    }
}
