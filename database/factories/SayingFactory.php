<?php

namespace Database\Factories;

use App\Enums\SayingKind;
use App\Models\Saying;
use App\Models\SayingCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Saying>
 */
class SayingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'saying_category_id' => SayingCategory::factory(),
            'slug' => fake()->unique()->slug(3),
            'kind' => SayingKind::Saying,
            'title' => null,
            'text' => 'حاسبوا أنفسكم قبل أن تُحاسبوا.',
            'attribution' => 'عمر بن الخطاب رضي الله عنه',
            'source' => null,
            'lesson' => null,
            'hadith_collection' => null,
            'hadith_number' => null,
            'sort_order' => 1,
        ];
    }

    /**
     * A story told with its lesson.
     */
    public function story(): static
    {
        return $this->state(fn (array $attributes) => [
            'kind' => SayingKind::Story,
            'title' => 'قاتل المائة نفس',
            'text' => 'كان فيمن قبلكم رجل قتل تسعة وتسعين نفسًا...',
            'lesson' => 'لا ذنب يغلق باب التوبة.',
        ]);
    }
}
