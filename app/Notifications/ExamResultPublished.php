<?php

namespace App\Notifications;

use App\Models\ExamEntry;

/**
 * The manager sent the student their exam result.
 */
class ExamResultPublished extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public ExamEntry $entry) {}

    public function title(object $notifiable): string
    {
        return __('Your exam result');
    }

    public function body(object $notifiable): string
    {
        $exam = $this->entry->day?->exam;
        $parts = [];

        if ($this->entry->grade !== null) {
            $parts[] = $this->entry->grade->label();
        }

        if ($this->entry->score !== null && $exam !== null) {
            $parts[] = __(':score of :max (:percent%)', [
                'score' => $this->entry->score,
                'max' => $exam->max_score,
                'percent' => $exam->percentOf($this->entry->score),
            ]);
        }

        return __('Your result in :title: :result', [
            'title' => $exam?->title ?? __('Exam'),
            'result' => implode(' · ', $parts),
        ]);
    }

    public function url(): ?string
    {
        return route('exams.show', $this->entry->day?->exam_id);
    }

    public function icon(): string
    {
        return 'award';
    }

    public function color(): string
    {
        return 'gold';
    }

    public function whatsAppTemplate(): ?string
    {
        return 'exam_result';
    }
}
