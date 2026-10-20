<?php

namespace Database\Factories;

use App\Models\HadithBook;
use App\Models\HadithCollection;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HadithBook>
 */
class HadithBookFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'hadith_collection_id' => HadithCollection::factory(),
            'number' => fake()->unique()->numberBetween(1, 500),
            'name' => 'كتاب الإيمان',
            'name_en' => 'The Book of Faith',
        ];
    }
}
