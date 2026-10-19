<?php

namespace Database\Factories;

use App\Enums\ExamDayPhase;
use App\Enums\ExamDayStatus;
use App\Models\Exam;
use App\Models\ExamDay;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ExamDay>
 */
class ExamDayFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'exam_id' => Exam::factory(),
            'starts_at' => now()->addDay()->startOfHour(),
            'ends_at' => null,
            'status' => ExamDayStatus::Scheduled,
            'phase' => ExamDayPhase::Opening,
        ];
    }

    public function live(): static
    {
        return $this->state(fn (): array => [
            'starts_at' => now()->subMinutes(10),
            'status' => ExamDayStatus::Live,
            'opened_at' => now()->subMinutes(10),
        ]);
    }

    public function examining(): static
    {
        return $this->live()->state(fn (): array => [
            'phase' => ExamDayPhase::Examining,
            'examining_started_at' => now()->subMinutes(5),
        ]);
    }

    public function closed(): static
    {
        return $this->state(fn (): array => [
            'starts_at' => now()->subDay(),
            'status' => ExamDayStatus::Closed,
            'opened_at' => now()->subDay(),
            'closed_at' => now()->subDay()->addHours(3),
        ]);
    }
}
