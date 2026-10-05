<?php

namespace App\Services;

use App\Enums\MessageType;
use App\Models\ChatRead;
use App\Models\Halaqa;
use App\Models\Message;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\JoinClause;
use Illuminate\Support\Str;

/**
 * Halaqa group chats: conversation list, unread counters and read markers.
 */
class ChatService
{
    /**
     * Conversations available to the user with their last message and unread count.
     *
     * @return list<array<string, mixed>>
     */
    public function conversations(User $user): array
    {
        $halaqat = $user->accessibleHalaqat()
            ->with('teacher:id,name')
            ->withCount('students')
            ->addSelect([
                'last_message_id' => Message::query()
                    ->select('id')
                    ->whereColumn('halaqa_id', 'halaqat.id')
                    ->latest('id')
                    ->limit(1),
            ])
            ->get();

        $lastMessages = Message::query()
            ->with('user:id,name')
            ->whereIn('id', $halaqat->pluck('last_message_id')->filter())
            ->get()
            ->keyBy('id');

        $unread = $this->unreadPerHalaqa($user, $halaqat->pluck('id')->all());

        return $halaqat
            ->map(function (Halaqa $halaqa) use ($lastMessages, $unread): array {
                $message = $lastMessages->get($halaqa->last_message_id);

                return [
                    'id' => $halaqa->id,
                    'name' => $halaqa->name,
                    'color' => $halaqa->color,
                    'is_active' => $halaqa->is_active,
                    'teacher' => $halaqa->teacher?->name,
                    'members_count' => $halaqa->students_count + ($halaqa->teacher_id ? 1 : 0),
                    'unread' => $unread[$halaqa->id] ?? 0,
                    'last_message' => $message ? [
                        'preview' => $this->preview($message),
                        'type' => $message->type->value,
                        'user' => $message->user?->name,
                        'created_at' => $message->created_at?->toIso8601String(),
                    ] : null,
                ];
            })
            ->sortByDesc(fn (array $conversation): string => $conversation['last_message']['created_at'] ?? '')
            ->values()
            ->all();
    }

    /**
     * Unread message counts keyed by halaqa ID.
     *
     * @param  list<int>  $halaqaIds
     * @return array<int, int>
     */
    public function unreadPerHalaqa(User $user, array $halaqaIds): array
    {
        if ($halaqaIds === []) {
            return [];
        }

        return Message::query()
            ->leftJoin('chat_reads', function (JoinClause $join) use ($user): void {
                $join->on('chat_reads.halaqa_id', '=', 'messages.halaqa_id')
                    ->where('chat_reads.user_id', '=', $user->id);
            })
            ->whereIn('messages.halaqa_id', $halaqaIds)
            ->where(fn (Builder $query) => $query->whereNull('messages.user_id')->orWhere('messages.user_id', '!=', $user->id))
            ->whereRaw('messages.id > COALESCE(chat_reads.last_read_message_id, 0)')
            ->groupBy('messages.halaqa_id')
            ->selectRaw('messages.halaqa_id as halaqa_id, COUNT(*) as unread')
            ->toBase()
            ->pluck('unread', 'halaqa_id')
            ->map(fn ($count): int => (int) $count)
            ->all();
    }

    /**
     * Total unread messages for the sidebar badge. The administration and academy managers only count
     * the chats they follow.
     */
    public function unreadCount(User $user): int
    {
        $halaqaIds = $user->managesAcademies()
            ? ChatRead::query()->where('user_id', $user->id)->pluck('halaqa_id')->all()
            : $user->accessibleHalaqat()->pluck('id')->all();

        return array_sum($this->unreadPerHalaqa($user, $halaqaIds));
    }

    public function markRead(Halaqa $halaqa, User $user, ?int $messageId = null): void
    {
        $messageId ??= (int) $halaqa->messages()->max('id');

        $read = ChatRead::query()->firstOrNew(['halaqa_id' => $halaqa->id, 'user_id' => $user->id]);

        if ($read->exists && $read->last_read_message_id >= $messageId) {
            return;
        }

        $read->last_read_message_id = $messageId;
        $read->save();
    }

    public function preview(Message $message): string
    {
        return match ($message->type) {
            MessageType::Text => Str::limit((string) $message->body, 80),
            MessageType::Image => '📷 '.__('Photo'),
            MessageType::Audio => '🎙️ '.__('Voice message'),
            MessageType::File => '📎 '.($message->attachment_name ?? __('File')),
        };
    }
}
