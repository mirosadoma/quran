<?php

namespace App\Notifications;

use App\Models\Academy;
use App\Models\User;

/**
 * To the manager: a student left the academy.
 */
class StudentLeftAcademy extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public User $student, public Academy $academy) {}

    public function title(object $notifiable): string
    {
        return __(':name left the academy', ['name' => $this->student->name]);
    }

    public function body(object $notifiable): string
    {
        return __(':name is no longer a student of :academy and was removed from its halaqat.', ['name' => $this->student->name, 'academy' => $this->academy->name]);
    }

    public function url(): ?string
    {
        return route('users.index', ['role' => 'student']);
    }

    public function icon(): string
    {
        return 'user-x';
    }

    public function color(): string
    {
        return 'slate';
    }

    public function sendsMail(): bool
    {
        return false;
    }
}
