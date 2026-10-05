<?php

namespace Database\Factories;

use App\Enums\HighlightColor;
use App\Models\Ayah;
use App\Models\MushafHighlight;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MushafHighlight>
 */
class MushafHighlightFactory extends Factory
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
            'ayah_id' => Ayah::factory(),
            'color' => fake()->randomElement(HighlightColor::cases()),
            'note' => null,
        ];
    }
}
