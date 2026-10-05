<?php

namespace Database\Factories;

use App\Enums\DeedKind;
use App\Enums\SinSeverity;
use App\Models\Deed;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Deed>
 */
class DeedFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $doneAt = fake()->dateTimeBetween('-10 days', 'now');

        return [
            'user_id' => User::factory(),
            'kind' => DeedKind::Good,
            'title' => 'قرأت وردي من القرآن',
            'catalog_key' => 'quran',
            'severity' => null,
            'done_at' => $doneAt,
            'done_on' => $doneAt->format('Y-m-d'),
        ];
    }

    public function sin(SinSeverity $severity = SinSeverity::Minor, ?string $catalogKey = 'lying'): static
    {
        return $this->state(fn (): array => [
            'kind' => DeedKind::Bad,
            'title' => 'كذبت في كلامي',
            'catalog_key' => $catalogKey,
            'severity' => $severity,
        ]);
    }

    public function repented(): static
    {
        return $this->state(fn (): array => ['repented_at' => now()]);
    }

    public function on(string $date): static
    {
        return $this->state(fn (): array => ['done_at' => $date.' 12:00:00', 'done_on' => $date]);
    }
}
