<?php

namespace Database\Factories;

use App\Enums\JoinRequestStatus;
use App\Models\Academy;
use App\Models\AcademyJoinRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<AcademyJoinRequest>
 */
class AcademyJoinRequestFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'academy_id' => Academy::factory(),
            'user_id' => User::factory()->student(),
            'status' => JoinRequestStatus::Pending,
            'message' => 'أرغب في الانضمام لحلقات الحفظ.',
        ];
    }
}
