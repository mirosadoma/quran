<?php

namespace App\Notifications;

use App\Models\Halaqa;

class AddedToHalaqa extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public Halaqa $halaqa) {}

    public function title(object $notifiable): string
    {
        return __('You joined a new halaqa');
    }

    public function body(object $notifiable): string
    {
        $teacher = $this->halaqa->teacher?->name;

        return $teacher
            ? __('You have been added to :halaqa with :teacher.', ['halaqa' => $this->halaqa->name, 'teacher' => $teacher])
            : __('You have been added to :halaqa.', ['halaqa' => $this->halaqa->name]);
    }

    public function url(): ?string
    {
        return route('halaqat.show', $this->halaqa);
    }

    public function icon(): string
    {
        return 'users';
    }

    public function whatsAppTemplate(): ?string
    {
        return 'added_to_halaqa';
    }
}
