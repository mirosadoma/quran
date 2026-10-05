<?php

namespace Database\Factories;

use App\Models\Ayah;
use App\Models\WordMeaning;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WordMeaning>
 */
class WordMeaningFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'ayah_id' => Ayah::factory(),
            'position' => 0,
            'word' => 'بِسَحَرٍ',
            'meaning' => 'آخر الليل',
            'source' => WordMeaning::MANUAL,
        ];
    }
}
