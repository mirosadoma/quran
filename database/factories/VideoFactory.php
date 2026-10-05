<?php

namespace Database\Factories;

use App\Models\Video;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Video>
 */
class VideoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'description' => fake()->sentence(),
            'url' => 'https://www.youtube.com/watch?v=TkSfCS_HMjs',
            'youtube_id' => 'TkSfCS_HMjs',
            'is_published' => true,
        ];
    }
}
