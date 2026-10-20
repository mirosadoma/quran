<?php

namespace Database\Factories;

use App\Models\SunnahCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SunnahCategory>
 */
class SunnahCategoryFactory extends Factory
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
            'name' => 'سنن '.fake()->unique()->word(),
            'description' => null,
            'icon' => 'sparkles',
            'color' => 'emerald',
            'sort_order' => 1,
        ];
    }
}
