<?php

namespace App\Notifications;

use App\Models\ExamDay;

/**
 * Reminds the students and examiners of an exam day: the day before, and shortly before it starts.
 */
class ExamReminder extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public ExamDay $day, public bool $dayBefore = false) {}

    public function title(object $notifiable): string
    {
        return $this->dayBefore ? __('Your exam is tomorrow') : __('Your exam starts soon');
    }

    public function body(object $notifiable): string
    {
        return __(':title on :time.', [
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
        return 'alarm-clock';
    }

    public function color(): string
    {
        return 'gold';
    }

    public function whatsAppTemplate(): ?string
    {
        return 'exam_reminder';
    }
}
