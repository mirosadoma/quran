<?php

namespace Database\Factories;

use App\Models\Reciter;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Reciter>
 */
class ReciterFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'name_en' => null,
            'slug' => fake()->unique()->slug(2),
            'description' => 'مرتّل · حفص عن عاصم',
            'audio_url' => 'https://everyayah.com/data/Husary_128kbps/',
            'is_active' => true,
            'sort_order' => 1,
        ];
    }
}
