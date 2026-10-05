<?php

namespace App\Enums;

enum UserRole: string
{
    /** The platform administration: every academy. */
    case Admin = 'admin';
    /** Runs one academy: its teachers, students, halaqat and sessions. */
    case Manager = 'manager';
    case Teacher = 'teacher';
    case Student = 'student';

    public function label(): string
    {
        return match ($this) {
            self::Admin => __('Admin'),
            self::Manager => __('Academy manager'),
            self::Teacher => __('Teacher'),
            self::Student => __('Student'),
        };
    }
}
