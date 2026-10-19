<?php

namespace App\Notifications;

use App\Models\ExamDay;

/**
 * The exam day opened: everyone enters the main hall.
 */
class ExamDayOpened extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public ExamDay $day) {}

    public function title(object $notifiable): string
    {
        return __('The exam has started');
    }

    public function body(object $notifiable): string
    {
        return __(':title has started. Enter the main hall now.', ['title' => $this->day->exam?->title ?? __('Exam')]);
    }

    public function url(): ?string
    {
        return route('exams.room', $this->day);
    }

    public function icon(): string
    {
        return 'video';
    }

    public function sendsMail(): bool
    {
        return false;
    }

    public function whatsAppTemplate(): ?string
    {
        return 'exam_started';
    }
}
