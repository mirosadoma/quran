<?php

namespace Database\Factories;

use App\Enums\AlarmKind;
use App\Models\Alarm;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Alarm>
 */
class AlarmFactory extends Factory
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
            'kind' => AlarmKind::Memorization,
            'title' => 'ورد الحفظ',
            'ring_at' => '06:00',
            'days' => null,
            'is_active' => true,
        ];
    }

    public function off(): static
    {
        return $this->state(fn (): array => ['is_active' => false]);
    }

    /**
     * @param  list<int>  $days
     */
    public function onDays(array $days): static
    {
        return $this->state(fn (): array => ['days' => $days]);
    }
}
