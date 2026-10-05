<?php

namespace App\Enums;

enum ProgressType: string
{
    case Memorization = 'memorization';
    case Revision = 'revision';

    public function label(): string
    {
        return match ($this) {
            self::Memorization => __('Memorization'),
            self::Revision => __('Revision'),
        };
    }
}
