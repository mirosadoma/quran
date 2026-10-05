<?php

namespace App\Models;

use App\Enums\MessageType;
use Database\Factories\MessageFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

#[Fillable(['halaqa_id', 'user_id', 'type', 'body', 'attachment_path', 'attachment_name', 'attachment_mime', 'attachment_size'])]
class Message extends Model
{
    /** @use HasFactory<MessageFactory> */
    use HasFactory;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => MessageType::class,
            'attachment_size' => 'integer',
        ];
    }

    /**
     * @return BelongsTo<Halaqa, $this>
     */
    public function halaqa(): BelongsTo
    {
        return $this->belongsTo(Halaqa::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Payload sent to the chat UI and broadcast to other members.
     *
     * @return array<string, mixed>
     */
    public function toChatArray(): array
    {
        return [
            'id' => $this->id,
            'halaqa_id' => $this->halaqa_id,
            'type' => $this->type->value,
            'body' => $this->body,
            'attachment' => $this->attachment_path ? [
                'url' => Storage::disk('public')->url($this->attachment_path),
                'name' => $this->attachment_name,
                'mime' => $this->attachment_mime,
                'size' => $this->attachment_size,
            ] : null,
            'user' => $this->user ? [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'role' => $this->user->role->value,
                'avatar_url' => $this->user->avatar_url,
            ] : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
