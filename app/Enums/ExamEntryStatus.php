<?php

namespace App\Enums;

/**
 * Where a student is in the queue of their examiner.
 */
enum ExamEntryStatus: string
{
    case Waiting = 'waiting';
    /** Told to get ready: their turn is next. */
    case Alerted = 'alerted';
    /** Called into the private room of the examiner. */
    case Called = 'called';
    case Examined = 'examined';
    case Absent = 'absent';

    public function label(): string
    {
        return match ($this) {
            self::Waiting => __('Waiting'),
            self::Alerted => __('Get ready'),
            self::Called => __('Being examined'),
            self::Examined => __('Examined'),
            self::Absent => __('Absent'),
        };
    }

    /**
     * Determine whether the student still waits for their turn.
     */
    public function isPending(): bool
    {
        return $this === self::Waiting || $this === self::Alerted;
    }
}
