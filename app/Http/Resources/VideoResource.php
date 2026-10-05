<?php

namespace App\Http\Resources;

use App\Models\Video;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Video
 */
class VideoResource extends JsonResource
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
            'title' => $this->title,
            'description' => $this->description,
            'url' => $this->url,
            'youtube_id' => $this->youtube_id,
            'thumbnail_url' => "https://i.ytimg.com/vi/{$this->youtube_id}/hqdefault.jpg",
            'is_published' => $this->is_published,
            'halaqa_id' => $this->halaqa_id,
            'created_at' => $this->created_at?->toIso8601String(),
            'halaqa' => $this->whenLoaded('halaqa', fn (): ?array => $this->halaqa ? [
                'id' => $this->halaqa->id,
                'name' => $this->halaqa->name,
                'color' => $this->halaqa->color,
            ] : null),
            'creator' => $this->whenLoaded('creator', fn (): ?array => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
            ] : null),
            'can_manage' => (bool) $request->user()?->can('update', $this->resource),
        ];
    }
}
