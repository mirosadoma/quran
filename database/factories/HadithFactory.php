<?php

namespace Database\Factories;

use App\Models\Hadith;
use App\Models\HadithCollection;
use App\Services\Mushaf;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Hadith>
 */
class HadithFactory extends Factory
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
            'hadith_book_id' => null,
            'number' => fake()->unique()->numberBetween(1, 7000),
            'part' => 1,
            'text' => 'إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى',
            'text_search' => fn (array $attributes): string => Mushaf::normalize($attributes['text']),
            'grade' => null,
            'grader' => null,
        ];
    }

    /**
     * Graded authentic by Al-Albani.
     */
    public function sahih(): static
    {
        return $this->state(fn (array $attributes) => ['grade' => 'صحيح', 'grader' => 'الألباني']);
    }
}
