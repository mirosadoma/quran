<?php

namespace App\Enums;

enum UserRole: string
{
    case Admin = 'admin';
    case Teacher = 'teacher';
    case Student = 'student';

    public function label(): string
    {
        return match ($this) {
            self::Admin => __('Admin'),
            self::Teacher => __('Teacher'),
            self::Student => __('Student'),
        };
    }
}
