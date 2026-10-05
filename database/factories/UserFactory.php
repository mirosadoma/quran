<?php

namespace Database\Factories;

use App\Enums\Gender;
use App\Enums\UserRole;
use App\Models\Academy;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => '+2010'.fake()->unique()->numerify('########'),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => UserRole::Student,
            'gender' => fake()->randomElement(Gender::cases()),
            'timezone' => config('app.user_timezone'),
            'locale' => 'ar',
            'is_active' => true,
            'remember_token' => Str::random(10),
        ];
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => ['role' => UserRole::Admin]);
    }

    /**
     * The manager of an academy (its manager_id is set when the academy is given).
     */
    public function manager(?Academy $academy = null): static
    {
        return $this->state(fn (array $attributes) => ['role' => UserRole::Manager, 'academy_id' => $academy?->id ?? Academy::factory()])
            ->afterCreating(function (User $user): void {
                if ($user->academy !== null && $user->academy->manager_id === null) {
                    $user->academy->forceFill(['manager_id' => $user->id])->save();
                }
            });
    }

    public function teacher(): static
    {
        return $this->state(fn (array $attributes) => ['role' => UserRole::Teacher]);
    }

    public function inAcademy(Academy $academy): static
    {
        return $this->state(fn (array $attributes) => ['academy_id' => $academy->id]);
    }

    public function student(): static
    {
        return $this->state(fn (array $attributes) => ['role' => UserRole::Student]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => ['is_active' => false]);
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
