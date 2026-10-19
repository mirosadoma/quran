<?php

namespace Database\Factories;

use App\Models\Academy;
use App\Models\Exam;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Exam>
 */
class ExamFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'academy_id' => Academy::factory(),
            'title' => 'اختبار '.fake()->unique()->word(),
            'description' => fake()->sentence(),
            'max_score' => 100,
        ];
    }
}
