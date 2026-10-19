<?php

namespace App\Http\Resources;

use App\Models\ExamEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin ExamEntry
 */
class ExamEntryResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        // A student sees their own result once it is published; everyone else sees it at once.
        $showsResult = $user === null || ! $user->isStudent() || $this->isPublished();

        return [
            'id' => $this->id,
            'exam_day_id' => $this->exam_day_id,
            'student_id' => $this->student_id,
            'halaqa_id' => $this->halaqa_id,
            'examiner_id' => $this->examiner_id,
            'position' => $this->position,
            'status' => $this->status->value,
            'alerted_at' => $this->alerted_at?->toIso8601String(),
            'called_at' => $this->called_at?->toIso8601String(),
            'finished_at' => $this->finished_at?->toIso8601String(),
            'grade' => $showsResult ? $this->grade?->value : null,
            'score' => $showsResult ? $this->score : null,
            'percent' => $showsResult ? $this->percent() : null,
            'notes' => $showsResult ? $this->notes : null,
            'is_graded' => $this->isGraded(),
            'graded_at' => $this->graded_at?->toIso8601String(),
            'published_at' => $this->published_at?->toIso8601String(),
            'student' => $this->whenLoaded('student', fn (): ?array => $this->student ? [
                'id' => $this->student->id,
                'name' => $this->student->name,
                'avatar_url' => $this->student->avatar_url,
            ] : null),
            'halaqa' => $this->whenLoaded('halaqa', fn (): ?array => $this->halaqa ? [
                'id' => $this->halaqa->id,
                'name' => $this->halaqa->name,
                'color' => $this->halaqa->color,
            ] : null),
            'examiner' => $this->whenLoaded('examiner', fn (): ?array => $this->examiner ? [
                'id' => $this->examiner->id,
                'name' => $this->examiner->name,
            ] : null),
            'grader' => $this->whenLoaded('grader', fn (): ?array => $this->grader ? [
                'id' => $this->grader->id,
                'name' => $this->grader->name,
            ] : null),
        ];
    }
}
