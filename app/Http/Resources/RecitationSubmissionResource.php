<?php

namespace App\Http\Resources;

use App\Models\RecitationSubmission;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin RecitationSubmission
 */
class RecitationSubmissionResource extends JsonResource
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
            'halaqa_id' => $this->halaqa_id,
            'memorization' => $this->portions['memorization'] ?? null,
            'revision' => $this->portions['revision'] ?? null,
            'notes' => $this->notes,
            'submitted_at' => $this->updated_at?->toIso8601String(),
            'student' => $this->whenLoaded('student', fn (): array => [
                'id' => $this->student->id,
                'name' => $this->student->name,
                'avatar_url' => $this->student->avatar_url,
            ]),
            'halaqa' => $this->whenLoaded('halaqa', fn (): ?array => $this->halaqa ? [
                'id' => $this->halaqa->id,
                'name' => $this->halaqa->name,
                'color' => $this->halaqa->color,
            ] : null),
        ];
    }
}
