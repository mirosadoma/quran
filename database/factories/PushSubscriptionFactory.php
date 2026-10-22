<?php

namespace Database\Factories;

use App\Models\PushSubscription;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<PushSubscription>
 */
class PushSubscriptionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Shaped like a Firebase Cloud Messaging registration token.
        $token = Str::random(22).':APA91b'.Str::random(134);

        return [
            'user_id' => User::factory(),
            'token' => $token,
            'token_hash' => PushSubscription::hashToken($token),
            'user_agent' => 'Chrome',
        ];
    }
}
