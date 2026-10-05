<?php

namespace Database\Factories;

use App\Models\Dhikr;
use App\Models\DhikrCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Dhikr>
 */
class DhikrFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'dhikr_category_id' => DhikrCategory::factory(),
            'title' => null,
            'text' => 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ',
            'repeat' => 3,
            'reference' => 'رواه مسلم',
            'virtue' => null,
            'sort_order' => 1,
            'is_active' => true,
        ];
    }

    /**
     * Hidden from everyone except the admin.
     */
    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => ['is_active' => false]);
    }
}
