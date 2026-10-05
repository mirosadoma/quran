<?php

namespace App\Notifications;

use App\Models\ProgressRecord;
use App\Services\Quran;

class ProgressRecorded extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public ProgressRecord $record) {}

    public function title(object $notifiable): string
    {
        return __('New recitation feedback');
    }

    public function body(object $notifiable): string
    {
        $range = app(Quran::class)->rangeLabel(
            $this->record->from_surah,
            $this->record->from_ayah,
            $this->record->to_surah,
            $this->record->to_ayah,
        );

        $body = $this->record->type->label().': '.$range;

        if ($this->record->grade !== null) {
            $body .= ' — '.$this->record->grade->label();
        }

        if (filled($this->record->notes)) {
            $body .= '. '.$this->record->notes;
        }

        return $body;
    }

    public function url(): ?string
    {
        return route('progress.student', $this->record->student_id);
    }

    public function icon(): string
    {
        return 'book-open-check';
    }

    public function color(): string
    {
        return 'gold';
    }

    public function whatsAppTemplate(): ?string
    {
        return 'progress_recorded';
    }
}
