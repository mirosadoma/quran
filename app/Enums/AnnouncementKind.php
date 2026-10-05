<?php

namespace App\Enums;

enum AnnouncementKind: string
{
    case Advice = 'advice';
    case Word = 'word';
    case Hadith = 'hadith';
    case Reminder = 'reminder';

    public function label(): string
    {
        return match ($this) {
            self::Advice => __('Advice'),
            self::Word => __('A word'),
            self::Hadith => __('Hadith'),
            self::Reminder => __('Reminder'),
        };
    }
}
