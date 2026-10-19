<?php

namespace App\Notifications;

use App\Models\ExamDay;

/**
 * Tells the students of a halaqa that they have an exam on the given day.
 */
class ExamScheduled extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public ExamDay $day) {}

    public function title(object $notifiable): string
    {
        return __('You have an exam');
    }

    public function body(object $notifiable): string
    {
        return __(':title on :time. Prepare well, and may Allah grant you success.', [
            'title' => $this->day->exam?->title ?? __('Exam'),
            'time' => $this->formatTime($this->day->starts_at, $notifiable),
        ]);
    }

    public function url(): ?string
    {
        return route('exams.show', $this->day->exam_id);
    }

    public function icon(): string
    {
        return 'clipboard-list';
    }

    public function color(): string
    {
        return 'gold';
    }

    public function whatsAppTemplate(): ?string
    {
        return 'exam_scheduled';
    }
}
