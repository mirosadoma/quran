<?php

namespace App\Enums;

enum HalaqaGender: string
{
    case Male = 'male';
    case Female = 'female';
    case Mixed = 'mixed';

    public function label(): string
    {
        return match ($this) {
            self::Male => __('Men & boys'),
            self::Female => __('Women & girls'),
            self::Mixed => __('Mixed'),
        };
    }

    /**
     * Determine whether a student of the given gender may join this halaqa.
     */
    public function accepts(?Gender $gender): bool
    {
        return $this === self::Mixed || $gender === null || $this->value === $gender->value;
    }
}
