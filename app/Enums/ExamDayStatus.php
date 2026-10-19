<?php

namespace App\Enums;

enum ExamDayStatus: string
{
    case Scheduled = 'scheduled';
    case Live = 'live';
    case Closed = 'closed';

    public function label(): string
    {
        return match ($this) {
            self::Scheduled => __('Scheduled'),
            self::Live => __('Live now'),
            self::Closed => __('Closed'),
        };
    }
}
