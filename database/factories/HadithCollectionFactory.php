<?php

namespace Database\Factories;

use App\Models\HadithCollection;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HadithCollection>
 */
class HadithCollectionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $word = fake()->unique()->word();

        return [
            'slug' => $word,
            'name' => "صحيح {$word}",
            'name_en' => "Sahih {$word}",
            'author' => 'الإمام محمد بن إسماعيل البخاري',
            'author_en' => 'Imam Muhammad ibn Ismail al-Bukhari',
            'description' => null,
            'description_en' => null,
            'icon' => 'book-open',
            'color' => 'emerald',
            'sort_order' => 1,
        ];
    }
}
