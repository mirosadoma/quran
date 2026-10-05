<?php

namespace Database\Factories;

use App\Enums\MessageType;
use App\Models\Halaqa;
use App\Models\Message;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Message>
 */
class MessageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'halaqa_id' => Halaqa::factory(),
            'user_id' => User::factory(),
            'type' => MessageType::Text,
            'body' => fake()->sentence(),
        ];
    }
}
