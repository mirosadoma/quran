<?php

namespace App\Enums;

enum TafsirEdition: string
{
    case Muyassar = 'muyassar';
    case Jalalayn = 'jalalayn';

    public function label(): string
    {
        return match ($this) {
            self::Muyassar => __('Al-Tafsir Al-Muyassar'),
            self::Jalalayn => __('Tafsir Al-Jalalayn'),
        };
    }
}
