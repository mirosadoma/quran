<?php

namespace App\Enums;

/**
 * What an alarm of the user reminds them of.
 */
enum AlarmKind: string
{
    case Memorization = 'memorization';
    case Revision = 'revision';
    case Prayer = 'prayer';
    case Dhikr = 'dhikr';
    case Custom = 'custom';

    public function label(): string
    {
        return match ($this) {
            self::Memorization => __('Memorization'),
            self::Revision => __('Revision'),
            self::Prayer => __('Prayer'),
            self::Dhikr => __('Adhkar'),
            self::Custom => __('Other'),
        };
    }

    /**
     * Lucide icon shown with the alarm.
     */
    public function icon(): string
    {
        return match ($this) {
            self::Memorization => 'book-open',
            self::Revision => 'repeat',
            self::Prayer => 'moon-star',
            self::Dhikr => 'hand-heart',
            self::Custom => 'alarm-clock',
        };
    }

    /**
     * The memorization and revision alarms ring until the student confirms they studied.
     */
    public function isStudy(): bool
    {
        return $this === self::Memorization || $this === self::Revision;
    }
}
