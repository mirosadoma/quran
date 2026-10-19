<?php

namespace App\Notifications;

use App\Models\ExamEntry;

/**
 * The opening word is over: the student goes to the hall of their examiner.
 */
class ExamExaminingStarted extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public ExamEntry $entry) {}

    public function title(object $notifiable): string
    {
        return __('Go to the hall of your examiner');
    }

    public function body(object $notifiable): string
    {
        $examiner = $this->entry->examiner?->name;

        return $examiner
            ? __('The examining has started. Enter the hall of :examiner and wait for your turn (you are number :position).', [
                'examiner' => $examiner,
                'position' => $this->entry->position,
            ])
            : __('The examining has started. Enter the hall and wait for your turn.');
    }

    public function url(): ?string
    {
        return route('exams.room', $this->entry->exam_day_id);
    }

    public function icon(): string
    {
        return 'door-open';
    }

    public function sendsMail(): bool
    {
        return false;
    }
}
