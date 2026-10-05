<?php

namespace Database\Factories;

use App\Enums\MeetingProvider;
use App\Enums\SessionSource;
use App\Enums\SessionStatus;
use App\Models\Halaqa;
use App\Models\HalaqaSession;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HalaqaSession>
 */
class HalaqaSessionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'halaqa_id' => Halaqa::factory(),
            'starts_at' => now()->addDay()->startOfHour(),
            'duration_minutes' => 60,
            'status' => SessionStatus::Scheduled,
            'source' => SessionSource::Manual,
            'meeting_provider' => MeetingProvider::Manual,
            'meeting_url' => fake()->url(),
        ];
    }

    public function completed(): static
    {
        return $this->state(fn (array $attributes) => [
            'starts_at' => now()->subDay()->startOfHour(),
            'status' => SessionStatus::Completed,
        ]);
    }
}
