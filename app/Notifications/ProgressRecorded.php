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
        $quran = app(Quran::class);

        $body = $this->record->recitationRecords()
            ->map(function (ProgressRecord $record) use ($quran): string {
                $line = $record->type->label().': '.$quran->rangeLabel($record->from_surah, $record->from_ayah, $record->to_surah, $record->to_ayah);

                if ($record->grade !== null) {
                    $line .= ' — '.$record->grade->label();
                }

                if ($record->mistakes > 0) {
                    $line .= ' ('.__(':count mistakes', ['count' => $record->mistakes]).')';
                }

                return $line;
            })
            ->implode(' · ');

        if (filled($this->record->notes)) {
            $body .= '. '.$this->record->notes;
        }

        return $body;
    }

    /**
     * Opens the recitations tab of the halaqa (or the progress page for records without a halaqa).
     */
    public function url(): ?string
    {
        if ($this->record->halaqa_id !== null) {
            return route('halaqat.show', ['halaqa' => $this->record->halaqa_id, 'tab' => 'records']);
        }

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
