<?php

namespace App\Http\Resources;

use App\Models\ExamDay;
use App\Models\Halaqa;
use App\Services\Exams\ExamDistributor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ExamDay
 */
class ExamDayResource extends JsonResource
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
            'exam_id' => $this->exam_id,
            'starts_at' => $this->starts_at->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            'status' => $this->status->value,
            'phase' => $this->phase->value,
            'opened_at' => $this->opened_at?->toIso8601String(),
            'examining_started_at' => $this->examining_started_at?->toIso8601String(),
            'closed_at' => $this->closed_at?->toIso8601String(),
            'exam' => $this->whenLoaded('exam', fn (): array => [
                'id' => $this->exam->id,
                'title' => $this->exam->title,
                'max_score' => $this->exam->max_score,
            ]),
            'halaqat' => $this->whenLoaded('halaqat', fn () => $this->halaqat->map(fn (Halaqa $halaqa): array => [
                'id' => $halaqa->id,
                'name' => $halaqa->name,
                'color' => $halaqa->color,
            ])->values()),
            'examiners' => $this->whenLoaded('examiners', fn () => ExamExaminerResource::collection($this->examiners)->resolve($request)),
            'entries' => $this->whenLoaded('entries', fn () => ExamEntryResource::collection($this->entries)->resolve($request)),
            'summary' => $this->when($this->relationLoaded('entries'), fn (): array => app(ExamDistributor::class)->summary($this->resource)),
            // The signed-in user on this day.
            'my_entry' => $this->when(
                $user !== null && $user->isStudent() && $this->relationLoaded('entries'),
                fn (): ?array => ($entry = $this->entryFor($user)) ? (new ExamEntryResource($entry))->resolve($request) : null,
            ),
            'my_examiner_id' => $this->when(
                $user !== null && $this->relationLoaded('examiners'),
                fn (): ?int => $this->examinerFor($user)?->id,
            ),
            'can_enter' => $user !== null && $this->relationLoaded('exam') && $this->isEnterableBy($user),
            'can_manage' => $user !== null && $this->relationLoaded('exam') && $this->isManagedBy($user),
        ];
    }
}
