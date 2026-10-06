<?php

namespace App\Http\Resources;

use App\Models\CommunityReply;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin CommunityReply
 */
class CommunityReplyResource extends JsonResource
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
            'body' => $this->body,
            'is_answer' => $this->is_answer,
            'is_accepted' => $this->accepted_at !== null,
            'created_at' => $this->created_at?->toIso8601String(),
            'edited_at' => $this->edited_at?->toIso8601String(),
            'author' => $this->whenLoaded('author', fn (): ?array => $this->author ? (new CommunityAuthorResource($this->author))->resolve($request) : null),
            'can' => [
                'update' => (bool) $request->user()?->can('update', $this->resource),
                'delete' => (bool) $request->user()?->can('delete', $this->resource),
                'accept' => (bool) $request->user()?->can('accept', $this->resource),
            ],
        ];
    }
}
