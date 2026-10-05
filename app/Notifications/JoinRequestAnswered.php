<?php

namespace App\Notifications;

use App\Enums\JoinRequestStatus;
use App\Models\AcademyJoinRequest;

/**
 * To the student: the academy accepted or declined their request.
 */
class JoinRequestAnswered extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public AcademyJoinRequest $joinRequest) {}

    protected function accepted(): bool
    {
        return $this->joinRequest->status === JoinRequestStatus::Accepted;
    }

    public function title(object $notifiable): string
    {
        return $this->accepted()
            ? __('Welcome to :academy!', ['academy' => $this->joinRequest->academy?->name])
            : __('Your request to join :academy was declined', ['academy' => $this->joinRequest->academy?->name]);
    }

    public function body(object $notifiable): string
    {
        if (filled($this->joinRequest->response)) {
            return (string) $this->joinRequest->response;
        }

        return $this->accepted()
            ? __('You are now a student of the academy. Its halaqat and sessions will appear in your account once the academy adds you to a halaqa.')
            : __('You can ask to join another academy.');
    }

    public function url(): ?string
    {
        return route('my-academy');
    }

    public function icon(): string
    {
        return $this->accepted() ? 'user-check' : 'user-x';
    }

    public function color(): string
    {
        return $this->accepted() ? 'emerald' : 'rose';
    }
}
