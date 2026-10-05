<?php

namespace Database\Factories;

use App\Models\ContactMessage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ContactMessage>
 */
class ContactMessageFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->safeEmail(),
            'subject' => 'استفسار عن الأكاديميات',
            'message' => 'السلام عليكم، أود معرفة طريقة الانضمام إلى إحدى الأكاديميات وتسجيل أبنائي.',
        ];
    }
}
