<?php

namespace App\Notifications;

use App\Models\ExamEntry;

/**
 * The examiner told the student to get ready: their turn is next.
 */
class ExamTurnSoon extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public ExamEntry $entry) {}

    public function title(object $notifiable): string
    {
        return __('Get ready, your turn is next');
    }

    public function body(object $notifiable): string
    {
        $examiner = $this->entry->examiner?->name;

        return $examiner
            ? __(':examiner will call you in a moment. Stay in the hall and prepare yourself.', ['examiner' => $examiner])
            : __('You will be called in a moment. Stay in the hall and prepare yourself.');
    }

    public function url(): ?string
    {
        return route('exams.room', $this->entry->exam_day_id);
    }

    public function icon(): string
    {
        return 'bell-ring';
    }

    public function color(): string
    {
        return 'gold';
    }

    public function sendsMail(): bool
    {
        return false;
    }

    public function whatsAppTemplate(): ?string
    {
        return 'exam_turn_soon';
    }
}
