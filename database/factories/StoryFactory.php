<?php

namespace Database\Factories;

use App\Enums\StoryKind;
use App\Models\Story;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Story>
 */
class StoryFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'kind' => StoryKind::Kids,
            'slug' => fake()->unique()->slug(2),
            'sort_order' => 1,
            'title' => 'قصة',
            'title_en' => 'A story',
            'summary' => 'ملخص القصة',
            'summary_en' => 'The summary',
            'icon' => null,
            'tone' => null,
            'sections' => [['heading' => null, 'paragraphs' => ['كان يا ما كان.'], 'ayahs' => []]],
            'lessons' => ['الصدق منجاة.'],
            'audio' => null,
        ];
    }

    /**
     * A story for children.
     */
    public function kids(): static
    {
        return $this->state(fn (array $attributes) => ['kind' => StoryKind::Kids]);
    }

    /**
     * The story of a prophet.
     */
    public function prophets(): static
    {
        return $this->state(fn (array $attributes) => ['kind' => StoryKind::Prophets]);
    }
}
