<?php

namespace Database\Factories;

use App\Enums\HalaqaGender;
use App\Models\Academy;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Academy>
 */
class AcademyFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = 'أكاديمية '.fake()->unique()->lastName();

        return [
            'name' => $name,
            'slug' => 'academy-'.fake()->unique()->numerify('#####'),
            'tagline' => 'تحفيظ القرآن الكريم بالتجويد',
            'description' => fake()->paragraph(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '+2012'.fake()->numerify('########'),
            'location' => fake()->city(),
            'gender' => HalaqaGender::Mixed,
            'timezone' => config('app.user_timezone'),
            'is_active' => true,
            'accepts_requests' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (): array => ['is_active' => false]);
    }

    /**
     * Not accepting requests to join.
     */
    public function closed(): static
    {
        return $this->state(fn (): array => ['accepts_requests' => false]);
    }
}
