<?php

namespace Database\Factories;

use App\Enums\TafsirEdition;
use App\Models\Ayah;
use App\Models\Tafsir;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Tafsir>
 */
class TafsirFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'edition' => TafsirEdition::Muyassar,
            'ayah_id' => Ayah::factory(),
            'text' => fake()->sentence(),
        ];
    }
}
