<?php

namespace App\Notifications;

use App\Models\ExamEntry;

/**
 * The examiner called the student into the private room.
 */
class ExamTurnNow extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public ExamEntry $entry) {}

    public function title(object $notifiable): string
    {
        return __('It is your turn now');
    }

    public function body(object $notifiable): string
    {
        $examiner = $this->entry->examiner?->name;

        return $examiner
            ? __('Enter the private room of :examiner now.', ['examiner' => $examiner])
            : __('Enter the private room now.');
    }

    public function url(): ?string
    {
        return route('exams.room', $this->entry->exam_day_id);
    }

    public function icon(): string
    {
        return 'mic';
    }

    public function color(): string
    {
        return 'rose';
    }

    public function sendsMail(): bool
    {
        return false;
    }

    public function whatsAppTemplate(): ?string
    {
        return 'exam_turn_now';
    }
}
