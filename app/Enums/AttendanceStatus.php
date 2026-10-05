<?php

namespace App\Enums;

enum AttendanceStatus: string
{
    case Present = 'present';
    case Late = 'late';
    case Absent = 'absent';
    case Excused = 'excused';

    public function label(): string
    {
        return match ($this) {
            self::Present => __('Present'),
            self::Late => __('Late'),
            self::Absent => __('Absent'),
            self::Excused => __('Excused'),
        };
    }

    /**
     * Determine whether this status counts as attending the session.
     */
    public function attended(): bool
    {
        return $this === self::Present || $this === self::Late;
    }
}
