<?php

namespace App\Enums;

/**
 * What an open exam day is doing: everyone in the main hall for the opening word,
 * or every student in the hall of their examiner.
 */
enum ExamDayPhase: string
{
    case Opening = 'opening';
    case Examining = 'examining';

    public function label(): string
    {
        return match ($this) {
            self::Opening => __('Opening word'),
            self::Examining => __('Examining'),
        };
    }
}
