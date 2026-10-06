<?php

namespace Database\Factories;

use App\Models\CommunityPost;
use App\Models\CommunityReply;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CommunityReply>
 */
class CommunityReplyFactory extends Factory
{
    /**
     * Define the model's default state: a student's comment.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'community_post_id' => CommunityPost::factory(),
            'user_id' => User::factory()->student(),
            'body' => fake()->paragraph(),
            'is_answer' => false,
        ];
    }

    /**
     * The answer of a sheikh (a teacher).
     */
    public function answer(): static
    {
        return $this->state(fn (array $attributes) => [
            'user_id' => User::factory()->teacher(),
            'is_answer' => true,
        ]);
    }

    /**
     * The answer the member who asked chose.
     */
    public function accepted(): static
    {
        return $this->answer()->state(fn (array $attributes) => ['accepted_at' => now()]);
    }
}
