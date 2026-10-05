<?php

namespace App\Enums;

/**
 * Voluntary prayers a user can be reminded of every day at a time they choose.
 */
enum PrayerReminderType: string
{
    case Qiyam = 'qiyam';
    case Duha = 'duha';

    public function label(): string
    {
        return match ($this) {
            self::Qiyam => __('Night prayer (Qiyam)'),
            self::Duha => __('Duha prayer'),
        };
    }

    /**
     * Suggested time when the reminder is first turned on.
     */
    public function defaultTime(): string
    {
        return match ($this) {
            self::Qiyam => '03:30',
            self::Duha => '09:00',
        };
    }
}
