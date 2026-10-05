<?php

namespace App\Notifications;

use App\Models\HalaqaSession;

class SessionEnded extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public HalaqaSession $session) {}

    public function title(object $notifiable): string
    {
        return __('The session has ended');
    }

    public function body(object $notifiable): string
    {
        $replace = ['title' => $this->session->displayTitle()];

        if (($notifiable->id ?? null) === $this->session->teacher_id) {
            return __(':title has ended. Review the attendance and record the recitations of your students.', $replace);
        }

        return __(':title has ended. May Allah bless your effort, see you in the next session.', $replace);
    }

    public function url(): ?string
    {
        return route('sessions.show', $this->session);
    }

    public function icon(): string
    {
        return 'circle-check';
    }

    public function color(): string
    {
        return 'slate';
    }

    public function sendsMail(): bool
    {
        return false;
    }

    public function whatsAppTemplate(): ?string
    {
        return 'session_ended';
    }
}
