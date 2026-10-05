<?php

namespace App\Http\Resources;

use App\Models\Halaqa;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Halaqa
 */
class HalaqaResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'color' => $this->color,
            'gender' => $this->gender->value,
            'level' => $this->level?->value,
            'capacity' => $this->capacity,
            'duration_minutes' => $this->duration_minutes,
            'timezone' => $this->timezone,
            'schedule' => $this->scheduleSlots(),
            'meeting_provider' => $this->meeting_provider->value,
            'starts_on' => $this->starts_on?->toDateString(),
            'is_active' => $this->is_active,
            'teacher' => $this->whenLoaded('teacher', fn (): ?array => $this->teacher ? [
                'id' => $this->teacher->id,
                'name' => $this->teacher->name,
                'avatar_url' => $this->teacher->avatar_url,
            ] : null),
            'students_count' => $this->whenCounted('students'),
            'next_session' => $this->whenLoaded('sessions', fn (): ?array => ($session = $this->sessions->first()) ? [
                'id' => $session->id,
                'starts_at' => $session->starts_at->toIso8601String(),
                'status' => $session->status->value,
            ] : null),
        ];
    }
}
