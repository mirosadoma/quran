<?php

namespace Database\Factories;

use App\Enums\PrayerReminderType;
use App\Models\PrayerReminder;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PrayerReminder>
 */
class PrayerReminderFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'prayer' => PrayerReminderType::Qiyam,
            'remind_at' => '03:30',
            'is_active' => true,
        ];
    }

    public function duha(): static
    {
        return $this->state(fn (): array => ['prayer' => PrayerReminderType::Duha, 'remind_at' => '09:00']);
    }

    public function off(): static
    {
        return $this->state(fn (): array => ['is_active' => false]);
    }
}
