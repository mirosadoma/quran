<?php

namespace Database\Factories;

use App\Models\MushafBookmark;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MushafBookmark>
 */
class MushafBookmarkFactory extends Factory
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
            'page' => fake()->numberBetween(1, 604),
            'ayah_id' => null,
            'label' => null,
        ];
    }
}
