<?php

namespace App\Notifications;

use App\Models\HalaqaSession;

class SessionScheduled extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public HalaqaSession $session, public bool $rescheduled = false) {}

    public function title(object $notifiable): string
    {
        return $this->rescheduled ? __('Session time changed') : __('New session scheduled');
    }

    public function body(object $notifiable): string
    {
        return __(':title on :time', [
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
        return $this->rescheduled ? 'calendar-clock' : 'calendar-plus';
    }

    public function color(): string
    {
        return 'sky';
    }
}
