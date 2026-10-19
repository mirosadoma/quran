<?php

namespace App\Http\Resources;

use App\Models\Exam;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Exam
 */
class ExamResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();

        return [
            'id' => $this->id,
            'academy_id' => $this->academy_id,
            'title' => $this->title,
            'description' => $this->description,
            'max_score' => $this->max_score,
            'state' => $this->when($this->relationLoaded('days'), fn (): string => $this->state()),
            'academy' => $this->whenLoaded('academy', fn (): ?array => $this->academy ? ['id' => $this->academy->id, 'name' => $this->academy->name] : null),
            'creator' => $this->whenLoaded('creator', fn (): ?array => $this->creator ? ['id' => $this->creator->id, 'name' => $this->creator->name] : null),
            'days' => $this->whenLoaded('days', fn () => ExamDayResource::collection($this->days)->resolve($request)),
            'days_count' => $this->whenCounted('days'),
            'entries_count' => $this->whenCounted('entries'),
            'created_at' => $this->created_at?->toIso8601String(),
            'can' => [
                'update' => $user !== null && $user->can('update', $this->resource),
                'delete' => $user !== null && $user->can('delete', $this->resource),
                'view_results' => $user !== null && $user->can('viewResults', $this->resource),
            ],
        ];
    }
}
