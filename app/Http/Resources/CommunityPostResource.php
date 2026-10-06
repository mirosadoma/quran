<?php

namespace App\Http\Resources;

use App\Models\CommunityPost;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CommunityPost
 */
class CommunityPostResource extends JsonResource
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
            'body' => $this->body,
            'created_at' => $this->created_at?->toIso8601String(),
            'edited_at' => $this->edited_at?->toIso8601String(),
            'author' => $this->whenLoaded('author', fn (): ?array => $this->author ? (new CommunityAuthorResource($this->author))->resolve($request) : null),
            'answers_count' => $this->whenCounted('answers'),
            'comments_count' => $this->whenCounted('comments'),
            'solved' => $this->whenHas('solved', fn (mixed $solved): bool => (bool) $solved),
            'can' => [
                'update' => (bool) $request->user()?->can('update', $this->resource),
                'delete' => (bool) $request->user()?->can('delete', $this->resource),
            ],
        ];
    }
}
