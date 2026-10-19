<?php

namespace App\Notifications;

use App\Models\Exam;
use App\Models\ExamDay;

/**
 * Tells the teachers of the academy that the manager scheduled an exam.
 */
class ExamCreated extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public Exam $exam) {}

    public function title(object $notifiable): string
    {
        return __('New exam scheduled');
    }

    public function body(object $notifiable): string
    {
        $days = $this->exam->days
            ->map(fn (ExamDay $day): string => $this->formatTime($day->starts_at, $notifiable))
            ->implode('، ');

        return $days !== ''
            ? __(':title in :academy. Days: :days', ['title' => $this->exam->title, 'academy' => $this->exam->academy?->name ?? '', 'days' => $days])
            : __(':title in :academy.', ['title' => $this->exam->title, 'academy' => $this->exam->academy?->name ?? '']);
    }

    public function url(): ?string
    {
        return route('exams.show', $this->exam);
    }

    public function icon(): string
    {
        return 'clipboard-list';
    }

    public function color(): string
    {
        return 'gold';
    }
}
