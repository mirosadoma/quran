<?php

namespace App\Notifications;

use App\Models\AcademyJoinRequest;
use Illuminate\Support\Str;

/**
 * To the manager: a student asks to join the academy.
 */
class JoinRequestReceived extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public AcademyJoinRequest $joinRequest) {}

    public function title(object $notifiable): string
    {
        return __('New request to join :academy', ['academy' => $this->joinRequest->academy?->name]);
    }

    public function body(object $notifiable): string
    {
        $body = __(':name asks to join the academy.', ['name' => $this->joinRequest->user?->name]);

        return filled($this->joinRequest->message) ? $body.' «'.Str::limit((string) $this->joinRequest->message, 160).'»' : $body;
    }

    public function url(): ?string
    {
        return route('join-requests.index');
    }

    public function icon(): string
    {
        return 'user-plus';
    }

    public function color(): string
    {
        return 'sky';
    }
}
