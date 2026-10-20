<?php

namespace Database\Factories;

use App\Models\Sunnah;
use App\Models\SunnahCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Sunnah>
 */
class SunnahFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'sunnah_category_id' => SunnahCategory::factory(),
            'slug' => fake()->unique()->slug(3),
            'title' => 'التسمية قبل الطعام',
            'text' => 'قل بسم الله قبل أن تبدأ الأكل.',
            'evidence' => 'يَا غُلاَمُ، سَمِّ اللَّهَ، وَكُلْ بِيَمِينِكَ، وَكُلْ مِمَّا يَلِيكَ',
            'source' => 'متفق عليه',
            'hadith_collection' => null,
            'hadith_number' => null,
            'sort_order' => 1,
        ];
    }

    /**
     * Linked to its hadith in the hadith tables.
     */
    public function fromHadith(string $collection, int $number): static
    {
        return $this->state(fn (array $attributes) => ['hadith_collection' => $collection, 'hadith_number' => $number]);
    }
}
