<?php

namespace Database\Factories;

use App\Enums\HalaqaGender;
use App\Enums\HalaqaLevel;
use App\Enums\MeetingProvider;
use App\Http\Requests\HalaqaRequest;
use App\Models\Halaqa;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Halaqa>
 */
class HalaqaFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'حلقة '.fake()->unique()->word(),
            'description' => fake()->sentence(),
            'teacher_id' => User::factory()->teacher(),
            'gender' => HalaqaGender::Mixed,
            'level' => fake()->randomElement(HalaqaLevel::cases()),
            'capacity' => 10,
            'schedule' => [['day' => 0, 'time' => '17:00'], ['day' => 2, 'time' => '17:00']],
            'duration_minutes' => 60,
            'timezone' => config('app.user_timezone'),
            'meeting_provider' => MeetingProvider::Jitsi,
            'color' => fake()->randomElement(HalaqaRequest::COLORS),
            'is_active' => true,
        ];
    }
}
