<?php

namespace App\Notifications;

use App\Models\ContactMessage;
use Illuminate\Support\Str;

/**
 * To the administration: a visitor wrote from the contact page.
 */
class ContactMessageReceived extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public ContactMessage $contactMessage) {}

    public function title(object $notifiable): string
    {
        return __('New message from :name', ['name' => $this->contactMessage->name]);
    }

    public function body(object $notifiable): string
    {
        return Str::limit(trim(($this->contactMessage->subject ? $this->contactMessage->subject.': ' : '').$this->contactMessage->message), 200);
    }

    public function url(): ?string
    {
        return route('contact-messages.index');
    }

    public function icon(): string
    {
        return 'mail';
    }

    public function color(): string
    {
        return 'gold';
    }
}
