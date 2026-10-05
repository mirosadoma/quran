<?php

namespace Database\Factories;

use App\Enums\AnnouncementDelivery;
use App\Enums\AnnouncementKind;
use App\Models\Halaqa;
use App\Models\HalaqaAnnouncement;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<HalaqaAnnouncement>
 */
class HalaqaAnnouncementFactory extends Factory
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
            'user_id' => null,
            'kind' => AnnouncementKind::Advice,
            'title' => null,
            'body' => fake()->sentence(),
            'delivery' => AnnouncementDelivery::Now,
            'scheduled_at' => null,
            'sent_at' => now(),
        ];
    }

    /**
     * Waiting for its scheduled time.
     */
    public function scheduled(?\DateTimeInterface $at = null): static
    {
        return $this->state(fn (array $attributes) => [
            'delivery' => AnnouncementDelivery::Scheduled,
            'scheduled_at' => $at ?? now()->addHour(),
            'sent_at' => null,
        ]);
    }

    /**
     * Waiting for the sessions it is attached to.
     */
    public function forSessions(): static
    {
        return $this->state(fn (array $attributes) => [
            'delivery' => AnnouncementDelivery::Sessions,
            'sent_at' => null,
        ]);
    }
}
