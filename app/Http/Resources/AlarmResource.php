<?php

namespace App\Http\Resources;

use App\Models\Alarm;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Alarm
 */
class AlarmResource extends JsonResource
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
            'kind' => $this->kind->value,
            'title' => $this->title,
            'time' => $this->time(),
            'days' => $this->days !== null ? array_map('intval', $this->days) : null,
            'is_active' => $this->is_active,
            'last_dismissed_on' => $this->last_dismissed_on?->toDateString(),
            'last_rang_on' => $this->last_rang_on?->toDateString(),
        ];
    }
}
