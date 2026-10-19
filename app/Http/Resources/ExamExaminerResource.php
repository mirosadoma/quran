<?php

namespace App\Http\Resources;

use App\Models\ExamExaminer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ExamExaminer
 */
class ExamExaminerResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $manages = $user !== null && $this->relationLoaded('day') && $this->day->isManagedBy($user);

        return [
            'id' => $this->id,
            'exam_day_id' => $this->exam_day_id,
            'user_id' => $this->user_id,
            'name' => $this->name,
            'email' => $this->when($manages, $this->email),
            'phone' => $this->when($manages, $this->phone),
            'is_external' => $this->isExternal(),
            'avatar_url' => $this->whenLoaded('user', fn (): ?string => $this->user?->avatar_url),
            // Only the manager sees the link of an outside examiner.
            'guest_url' => $this->when($manages && $this->isExternal(), fn (): ?string => $this->guestUrl()),
            'entries_count' => $this->whenCounted('entries'),
            'last_seen_at' => $this->last_seen_at?->toIso8601String(),
        ];
    }
}
