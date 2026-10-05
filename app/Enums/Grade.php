<?php

namespace App\Enums;

enum Grade: string
{
    case Excellent = 'excellent';
    case VeryGood = 'very_good';
    case Good = 'good';
    case Acceptable = 'acceptable';
    case Weak = 'weak';

    public function label(): string
    {
        return match ($this) {
            self::Excellent => __('Excellent'),
            self::VeryGood => __('Very good'),
            self::Good => __('Good'),
            self::Acceptable => __('Acceptable'),
            self::Weak => __('Needs repetition'),
        };
    }

    /**
     * Numeric score used to compute averages (1 to 5).
     */
    public function score(): int
    {
        return match ($this) {
            self::Excellent => 5,
            self::VeryGood => 4,
            self::Good => 3,
            self::Acceptable => 2,
            self::Weak => 1,
        };
    }

    /**
     * Map an average score back to the closest grade.
     */
    public static function fromScore(float $score): self
    {
        return match (true) {
            $score >= 4.5 => self::Excellent,
            $score >= 3.5 => self::VeryGood,
            $score >= 2.5 => self::Good,
            $score >= 1.5 => self::Acceptable,
            default => self::Weak,
        };
    }

    /**
     * SQL expression that converts the grade column into its numeric score.
     */
    public static function scoreSql(string $column = 'grade'): string
    {
        $cases = collect(self::cases())
            ->map(fn (self $grade): string => "WHEN '{$grade->value}' THEN {$grade->score()}")
            ->implode(' ');

        return "CASE {$column} {$cases} ELSE NULL END";
    }
}
