<?php

namespace App\Http\Resources;

use App\Models\ProgressRecord;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ProgressRecord
 */
class ProgressRecordResource extends JsonResource
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
            'type' => $this->type->value,
            'from_surah' => $this->from_surah,
            'from_ayah' => $this->from_ayah,
            'to_surah' => $this->to_surah,
            'to_ayah' => $this->to_ayah,
            'ayahs_count' => $this->ayahs_count,
            'grade' => $this->grade?->value,
            'mistakes' => $this->mistakes,
            'notes' => $this->notes,
            'recorded_on' => $this->recorded_on->toDateString(),
            'halaqa_id' => $this->halaqa_id,
            'halaqa_session_id' => $this->halaqa_session_id,
            'group_uuid' => $this->group_uuid,
            'portions' => $this->recitationRecords()->map(fn (ProgressRecord $record): array => [
                'id' => $record->id,
                'type' => $record->type->value,
                'from_surah' => $record->from_surah,
                'from_ayah' => $record->from_ayah,
                'to_surah' => $record->to_surah,
                'to_ayah' => $record->to_ayah,
                'ayahs_count' => $record->ayahs_count,
                'grade' => $record->grade?->value,
                'mistakes' => $record->mistakes,
            ])->values()->all(),
            'student' => $this->whenLoaded('student', fn (): array => [
                'id' => $this->student->id,
                'name' => $this->student->name,
                'avatar_url' => $this->student->avatar_url,
            ]),
            'teacher' => $this->whenLoaded('teacher', fn (): ?array => $this->teacher ? [
                'id' => $this->teacher->id,
                'name' => $this->teacher->name,
            ] : null),
            'halaqa' => $this->whenLoaded('halaqa', fn (): ?array => $this->halaqa ? [
                'id' => $this->halaqa->id,
                'name' => $this->halaqa->name,
                'color' => $this->halaqa->color,
            ] : null),
            'can_manage' => (bool) $request->user()?->can('update', $this->resource),
        ];
    }
}
