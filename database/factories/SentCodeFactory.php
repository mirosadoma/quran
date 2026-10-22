<?php

namespace Database\Factories;

use App\Enums\CodePurpose;
use App\Models\SentCode;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SentCode>
 */
class SentCodeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'purpose' => CodePurpose::PasswordReset,
            'channel' => 'email',
            'destination' => fake()->safeEmail(),
            'code' => str_pad((string) fake()->numberBetween(0, 999_999), 6, '0', STR_PAD_LEFT),
            'expires_at' => now()->addMinutes(15),
        ];
    }
}
