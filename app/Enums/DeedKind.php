<?php

namespace App\Enums;

enum DeedKind: string
{
    case Good = 'good';
    case Bad = 'bad';

    public function label(): string
    {
        return match ($this) {
            self::Good => __('Good deed'),
            self::Bad => __('Bad deed'),
        };
    }
}
