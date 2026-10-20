<?php

namespace Database\Factories;

use App\Models\SayingCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SayingCategory>
 */
class SayingCategoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'slug' => fake()->unique()->slug(2),
            'name' => 'أقوال '.fake()->unique()->word(),
            'description' => null,
            'icon' => 'quote',
            'color' => 'emerald',
            'sort_order' => 1,
        ];
    }
}
