<?php

namespace Database\Factories;

use App\Enums\ExamEntryStatus;
use App\Enums\Grade;
use App\Models\ExamDay;
use App\Models\ExamEntry;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExamEntry>
 */
class ExamEntryFactory extends Factory
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
            'student_id' => User::factory()->student(),
            'position' => 1,
            'status' => ExamEntryStatus::Waiting,
        ];
    }

    public function graded(Grade $grade = Grade::Excellent, int $score = 95): static
    {
        return $this->state(fn (): array => [
            'status' => ExamEntryStatus::Examined,
            'finished_at' => now(),
            'grade' => $grade,
            'score' => $score,
            'graded_at' => now(),
        ]);
    }

    public function published(): static
    {
        return $this->graded()->state(fn (): array => ['published_at' => now()]);
    }
}
