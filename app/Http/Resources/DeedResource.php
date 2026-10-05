<?php

namespace App\Http\Resources;

use App\Models\Deed;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Deed
 */
class DeedResource extends JsonResource
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
            'notes' => $this->notes,
            'catalog_key' => $this->catalog_key,
            'severity' => $this->severity?->value,
            'date' => $this->done_on,
            // The time of day in the user's timezone.
            'time' => $this->done_at->copy()->setTimezone($request->user()->displayTimezone())->format('H:i'),
            'repented_at' => $this->repented_at?->toIso8601String(),
        ];
    }
}
