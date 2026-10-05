<?php

namespace App\Http\Resources;

use App\Models\Halaqa;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin User
 */
class UserResource extends JsonResource
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
            'email' => $this->email,
            'phone' => $this->phone,
            'role' => $this->role->value,
            'gender' => $this->gender?->value,
            'avatar_url' => $this->avatar_url,
            'is_active' => $this->is_active,
            'memorized_ayahs' => $this->memorized_ayahs,
            'last_login_at' => $this->last_login_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'halaqat_count' => $this->whenCounted('halaqat'),
            'teaching_halaqat_count' => $this->whenCounted('teachingHalaqat'),
            'halaqat' => $this->whenLoaded('halaqat', fn () => $this->halaqat->map(fn (Halaqa $halaqa): array => [
                'id' => $halaqa->id,
                'name' => $halaqa->name,
                'color' => $halaqa->color,
            ])->values()),
        ];
    }
}
