<?php

namespace App\Notifications;

use App\Enums\PrayerReminderType;

/**
 * The daily reminder of a voluntary prayer, at the time the user chose.
 */
class PrayerReminderNotification extends AppNotification
{
    /**
     * Create a new notification instance.
     */
    public function __construct(public PrayerReminderType $prayer) {}

    public function title(object $notifiable): string
    {
        return match ($this->prayer) {
            PrayerReminderType::Qiyam => __('Time for the night prayer'),
            PrayerReminderType::Duha => __('Time for the duha prayer'),
        };
    }

    /**
     * A different encouragement every day.
     */
    public function body(object $notifiable): string
    {
        $lines = match ($this->prayer) {
            PrayerReminderType::Qiyam => [
                __('Our Lord descends every night when the last third remains and says: who calls upon Me, that I may answer him? Pray even two rak\'ahs.'),
                __('The best prayer after the obligatory prayers is the night prayer (Muslim). Pray what you can, then end with witr.'),
                __('They forsake their beds to call upon their Lord in fear and hope. Two rak\'ahs now, and a moment of asking forgiveness before dawn.'),
            ],
            PrayerReminderType::Duha => [
                __('Two rak\'ahs of duha are enough for the charity owed for every joint of your body today (Muslim).'),
                __('My dearest friend advised me to pray the two rak\'ahs of duha (Bukhari and Muslim). Take a few minutes for them now.'),
            ],
        };

        return $lines[now()->dayOfYear % count($lines)];
    }

    public function url(): ?string
    {
        return route('prayers.show', $this->prayer->value);
    }

    public function icon(): string
    {
        return $this->prayer === PrayerReminderType::Qiyam ? 'moon-star' : 'sun';
    }

    public function color(): string
    {
        return $this->prayer === PrayerReminderType::Qiyam ? 'slate' : 'gold';
    }

    public function sendsMail(): bool
    {
        return false;
    }
}
