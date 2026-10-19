<?php

namespace Database\Factories;

use App\Models\ExamDay;
use App\Models\ExamExaminer;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExamExaminer>
 */
class ExamExaminerFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'exam_day_id' => ExamDay::factory(),
            'user_id' => null,
            'name' => fake()->name(),
            'email' => fake()->safeEmail(),
            'token' => ExamExaminer::newToken(),
        ];
    }

    /**
     * A teacher of the platform (no link needed).
     */
    public function forUser(User $user): static
    {
        return $this->state(fn (): array => [
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'token' => null,
        ]);
    }
}
