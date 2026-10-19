<?php

namespace App\Http\Resources;

use App\Models\HalaqaSession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin HalaqaSession
 */
class SessionResource extends JsonResource
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
            'title' => $this->title,
            'display_title' => $this->displayTitle(),
            'starts_at' => $this->starts_at->toIso8601String(),
            'ends_at' => $this->endsAt()->toIso8601String(),
            'duration_minutes' => $this->duration_minutes,
            'status' => $this->status->value,
            'source' => $this->source->value,
            'meeting_provider' => $this->meeting_provider->value,
            'has_meeting' => filled($this->meeting_url),
            'cancel_reason' => $this->cancel_reason,
            'recording_url' => $this->recording_url,
            'recording_file_url' => $this->recording_path ? Storage::disk(config('meetings.recordings_disk'))->url($this->recording_path) : null,
            'recording_kind' => $this->recording_path ? 'file' : ($this->recording_url ? 'link' : null),
            'halaqa' => $this->whenLoaded('halaqa', fn (): array => [
                'id' => $this->halaqa->id,
                'name' => $this->halaqa->name,
                'color' => $this->halaqa->color,
            ]),
            'teacher' => $this->whenLoaded('teacher', fn (): ?array => $this->teacher ? [
                'id' => $this->teacher->id,
                'name' => $this->teacher->name,
                'avatar_url' => $this->teacher->avatar_url,
            ] : null),
            'attendances_count' => $this->whenCounted('attendances'),
            'present_count' => $this->whenHas('present_count', fn (): int => (int) $this->present_count),
            'my_attendance' => $this->whenLoaded('attendances', fn (): ?string => $this->attendances->first()?->status->value),
            'can_join' => $user !== null && $this->relationLoaded('halaqa') && $this->isJoinableBy($user),
            'can_manage' => $user !== null && $this->relationLoaded('halaqa') && $this->isManagedBy($user),
        ];
    }
}
