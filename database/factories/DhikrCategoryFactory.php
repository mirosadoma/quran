<?php

namespace Database\Factories;

use App\Models\DhikrCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<DhikrCategory>
 */
class DhikrCategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => 'أذكار '.fake()->unique()->word(),
            'slug' => fake()->unique()->slug(2),
            'description' => null,
            'icon' => 'sparkles',
            'color' => 'emerald',
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
