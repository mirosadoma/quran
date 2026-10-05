<?php

namespace App\Http\Resources;

use App\Models\AcademyJoinRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AcademyJoinRequest
 */
class JoinRequestResource extends JsonResource
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
            'status' => $this->status->value,
            'message' => $this->message,
            'response' => $this->response,
            'created_at' => $this->created_at?->toIso8601String(),
            'decided_at' => $this->decided_at?->toIso8601String(),
            'academy' => $this->whenLoaded('academy', fn (): ?array => $this->academy ? [
                'id' => $this->academy->id,
                'name' => $this->academy->name,
                'slug' => $this->academy->slug,
                'logo_url' => $this->academy->logo_url,
            ] : null),
            'user' => $this->whenLoaded('user', fn (): ?array => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'phone' => $this->user->phone,
                'gender' => $this->user->gender?->value,
                'avatar_url' => $this->user->avatar_url,
                'country' => $this->user->country,
            ] : null),
            'decider' => $this->whenLoaded('decider', fn (): ?array => $this->decider ? ['id' => $this->decider->id, 'name' => $this->decider->name] : null),
        ];
    }
}
