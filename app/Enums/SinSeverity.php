<?php

namespace App\Enums;

enum SinSeverity: string
{
    case Minor = 'minor';
    case Major = 'major';

    public function label(): string
    {
        return match ($this) {
            self::Minor => __('Minor sin'),
            self::Major => __('Major sin'),
        };
    }
}
