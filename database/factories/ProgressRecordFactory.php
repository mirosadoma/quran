<?php

namespace Database\Factories;

use App\Enums\Grade;
use App\Enums\ProgressType;
use App\Models\ProgressRecord;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProgressRecord>
 */
class ProgressRecordFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'student_id' => User::factory()->student(),
            'type' => ProgressType::Memorization,
            'from_surah' => 67,
            'from_ayah' => 1,
            'to_surah' => 67,
            'to_ayah' => 10,
            'ayahs_count' => 10,
            'grade' => fake()->randomElement(Grade::cases()),
            'mistakes' => fake()->numberBetween(0, 4),
            'recorded_on' => now()->toDateString(),
        ];
    }
}
