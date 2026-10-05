<?php

namespace Database\Factories;

use App\Models\Halaqa;
use App\Models\RecitationSubmission;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RecitationSubmission>
 */
class RecitationSubmissionFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'student_id' => User::factory()->student(),
            'halaqa_id' => Halaqa::factory(),
            'portions' => [
                'memorization' => ['from_surah' => 67, 'from_ayah' => 1, 'to_surah' => 67, 'to_ayah' => 10],
                'revision' => ['from_surah' => 78, 'from_ayah' => 1, 'to_surah' => 78, 'to_ayah' => 40],
            ],
            'notes' => null,
        ];
    }
}
