<?php

namespace App\Http\Resources;

use App\Models\Academy;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Academy
 */
class AcademyResource extends JsonResource
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
            'slug' => $this->slug,
            'tagline' => $this->tagline,
            'description' => $this->description,
            'logo_url' => $this->logo_url,
            'email' => $this->email,
            'phone' => $this->phone,
            'location' => $this->location,
            'gender' => $this->gender->value,
            'timezone' => $this->timezone,
            'is_active' => $this->is_active,
            'accepts_requests' => $this->accepts_requests,
            'archived' => $this->trashed(),
            'created_at' => $this->created_at?->toIso8601String(),
            'manager' => $this->whenLoaded('manager', fn (): ?array => $this->manager ? [
                'id' => $this->manager->id,
                'name' => $this->manager->name,
                'email' => $this->manager->email,
                'phone' => $this->manager->phone,
                'avatar_url' => $this->manager->avatar_url,
                'is_active' => $this->manager->is_active,
            ] : null),
            'counts' => [
                'teachers' => $this->teachers_count ?? null,
                'students' => $this->students_count ?? null,
                'halaqat' => $this->halaqat_count ?? null,
                'pending_requests' => $this->pending_requests_count ?? null,
            ],
        ];
    }
}
