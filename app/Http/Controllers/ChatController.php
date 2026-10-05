<?php

namespace App\Http\Controllers;

use App\Enums\MessageType;
use App\Events\MessageDeleted;
use App\Events\MessageSent;
use App\Http\Requests\MessageRequest;
use App\Models\Halaqa;
use App\Models\Message;
use App\Models\User;
use App\Services\ChatService;
use App\Services\Realtime;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ChatController extends Controller
{
    protected const PAGE_SIZE = 40;

    public function __construct(protected ChatService $chat) {}

    /**
     * List the halaqa conversations.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $user = $request->user();
        $conversations = $this->chat->conversations($user);

        if (! $user->managesAcademies() && count($conversations) === 1) {
            return redirect()->route('chat.show', $conversations[0]['id']);
        }

        return Inertia::render('chat/index', [
            'conversations' => $conversations,
            'conversation' => null,
            'messages' => [],
            'hasMore' => false,
            'members' => [],
            'canModerate' => false,
        ]);
    }

    /**
     * Open a halaqa conversation.
     */
    public function show(Request $request, Halaqa $halaqa): Response
    {
        $this->authorize('chat', $halaqa);

        $user = $request->user();
        $messages = $halaqa->messages()->with('user')->latest('id')->limit(self::PAGE_SIZE + 1)->get();
        $hasMore = $messages->count() > self::PAGE_SIZE;
        $messages = $messages->take(self::PAGE_SIZE)->reverse()->values();

        $this->chat->markRead($halaqa, $user, (int) ($messages->last()?->id ?? 0));

        $halaqa->load('teacher');

        $members = $halaqa->students()->orderBy('name')->get()
            ->prepend($halaqa->teacher)
            ->filter()
            ->map(fn (User $member): array => [
                'id' => $member->id,
                'name' => $member->name,
                'role' => $member->role->value,
                'avatar_url' => $member->avatar_url,
            ])
            ->values();

        return Inertia::render('chat/index', [
            'conversations' => $this->chat->conversations($user),
            'conversation' => [
                'id' => $halaqa->id,
                'name' => $halaqa->name,
                'color' => $halaqa->color,
                'teacher' => $halaqa->teacher?->name,
                'members_count' => $members->count(),
            ],
            'messages' => $messages->map(fn (Message $message): array => $message->toChatArray())->all(),
            'hasMore' => $hasMore,
            'members' => $members,
            'canModerate' => $user->managesAcademy($halaqa->academy_id) || $halaqa->teacher_id === $user->id,
        ]);
    }

    /**
     * Older messages (?before=id) or new messages (?after=id) as JSON.
     */
    public function messages(Request $request, Halaqa $halaqa): JsonResponse
    {
        $this->authorize('chat', $halaqa);

        $query = $halaqa->messages()->with('user');

        if ($after = $request->integer('after')) {
            $messages = $query->where('id', '>', $after)->orderBy('id')->limit(100)->get();

            return response()->json([
                'messages' => $messages->map(fn (Message $message): array => $message->toChatArray())->all(),
                'has_more' => false,
            ]);
        }

        $messages = $query
            ->when($request->integer('before'), fn ($query, int $before) => $query->where('id', '<', $before))
            ->latest('id')
            ->limit(self::PAGE_SIZE + 1)
            ->get();

        return response()->json([
            'messages' => $messages->take(self::PAGE_SIZE)->reverse()->values()->map(fn (Message $message): array => $message->toChatArray())->all(),
            'has_more' => $messages->count() > self::PAGE_SIZE,
        ]);
    }

    /**
     * Send a message (text, image, file or voice note).
     */
    public function store(MessageRequest $request, Halaqa $halaqa): JsonResponse
    {
        $user = $request->user();
        $attributes = ['user_id' => $user->id, 'body' => $request->input('body'), 'type' => MessageType::Text];

        if ($file = $request->file('attachment')) {
            $attributes = [
                ...$attributes,
                'attachment_path' => $file->store("chat/{$halaqa->id}", 'public'),
                'attachment_name' => Str::limit($file->getClientOriginalName(), 200, ''),
                'attachment_mime' => $file->getMimeType(),
                'attachment_size' => $file->getSize(),
                'type' => $request->input('kind') === 'audio' ? MessageType::Audio : MessageType::fromMime($file->getMimeType()),
            ];
        }

        $message = $halaqa->messages()->create($attributes);
        $message->setRelation('user', $user);

        if (Realtime::enabled()) {
            broadcast(new MessageSent($message))->toOthers();
        }

        $this->chat->markRead($halaqa, $user, $message->id);

        return response()->json(['message' => $message->toChatArray()], 201);
    }

    /**
     * Delete a message (its author, the teacher or an admin).
     */
    public function destroy(Message $message): JsonResponse
    {
        $this->authorize('delete', $message);

        if ($message->attachment_path) {
            Storage::disk('public')->delete($message->attachment_path);
        }

        $message->delete();

        if (Realtime::enabled()) {
            broadcast(new MessageDeleted($message->halaqa_id, $message->id))->toOthers();
        }

        return response()->json(['deleted' => true]);
    }

    /**
     * Mark the conversation as read.
     */
    public function read(Request $request, Halaqa $halaqa): JsonResponse
    {
        $this->authorize('chat', $halaqa);

        $this->chat->markRead($halaqa, $request->user(), $request->integer('message_id') ?: null);

        return response()->json(['unread' => $this->chat->unreadCount($request->user())]);
    }
}
