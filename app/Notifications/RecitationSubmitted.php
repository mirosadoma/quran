<?php

namespace App\Notifications;

use App\Enums\ProgressType;
use App\Models\RecitationSubmission;
use App\Services\Quran;

class RecitationSubmitted extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public RecitationSubmission $submission) {}

    public function title(object $notifiable): string
    {
        return __(':name entered a recitation', ['name' => $this->submission->student->name]);
    }

    public function body(object $notifiable): string
    {
        $quran = app(Quran::class);

        return collect(ProgressType::cases())
            ->filter(fn (ProgressType $type): bool => filled($this->submission->portions[$type->value] ?? null))
            ->map(function (ProgressType $type) use ($quran): string {
                $portion = $this->submission->portions[$type->value];

                return $type->label().': '.$quran->rangeLabel($portion['from_surah'], $portion['from_ayah'], $portion['to_surah'], $portion['to_ayah']);
            })
            ->implode(' · ');
    }

    /**
     * Opens the halaqa with the grading form of this recitation.
     */
    public function url(): ?string
    {
        return route('halaqat.show', [
            'halaqa' => $this->submission->halaqa_id,
            'tab' => 'students',
            'submission' => $this->submission->id,
        ]);
    }

    public function icon(): string
    {
        return 'book-open-check';
    }

    public function color(): string
    {
        return 'sky';
    }

    public function sendsMail(): bool
    {
        return false;
    }
}
