<?php

namespace Database\Factories;

use App\Models\CommunityPost;
use App\Models\CommunityReply;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CommunityPost>
 */
class CommunityPostFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory()->student(),
            'title' => rtrim(fake()->sentence(), '.').'?',
            'body' => fake()->paragraph(),
        ];
    }

    /**
     * A sheikh answered it.
     */
    public function answered(): static
    {
        return $this->has(CommunityReply::factory()->answer(), 'replies');
    }
}
