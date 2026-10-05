<?php

namespace App\Http\Resources;

use App\Enums\SessionStatus;
use App\Models\HalaqaAnnouncement;
use App\Models\HalaqaSession;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * @mixin HalaqaAnnouncement
 */
class HalaqaAnnouncementResource extends JsonResource
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
            'kind' => $this->kind->value,
            'title' => $this->title,
            'body' => $this->body,
            'delivery' => $this->delivery->value,
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'sent_at' => $this->sent_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'author' => $this->whenLoaded('author', fn (): ?array => $this->author ? [
                'id' => $this->author->id,
                'name' => $this->author->name,
                'avatar_url' => $this->author->avatar_url,
            ] : null),
            'halaqa' => $this->whenLoaded('halaqa', fn (): ?array => $this->halaqa ? [
                'id' => $this->halaqa->id,
                'name' => $this->halaqa->name,
                'color' => $this->halaqa->color,
            ] : null),
            'sessions' => $this->whenLoaded('sessions', fn (): array => $this->sessions->map(fn (HalaqaSession $session): array => [
                'id' => $session->id,
                'title' => $session->displayTitle(),
                'starts_at' => $session->starts_at->toIso8601String(),
                'cancelled' => $session->status === SessionStatus::Cancelled,
                'sent_at' => $session->pivot?->sent_at ? Carbon::parse($session->pivot->sent_at)->toIso8601String() : null,
            ])->values()->all()),
            'can' => [
                'update' => (bool) $user?->can('update', $this->resource),
                'delete' => (bool) $user?->can('delete', $this->resource),
            ],
        ];
    }
}
