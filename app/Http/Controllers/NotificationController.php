<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;

class NotificationController extends Controller
{
    /**
     * All notifications of the user.
     */
    public function index(Request $request): Response
    {
        $notifications = $request->user()->notifications()->paginate(20);

        return Inertia::render('notifications/index', [
            'notifications' => $notifications->through(fn (DatabaseNotification $notification): array => $this->present($notification)),
        ]);
    }

    /**
     * Latest notifications for the bell menu.
     */
    public function latest(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'notifications' => $user->notifications()->limit(8)->get()
                ->map(fn (DatabaseNotification $notification): array => $this->present($notification)),
            'unread' => $user->unreadNotifications()->count(),
        ]);
    }

    /**
     * Mark a notification as read and open its link.
     */
    public function read(Request $request, string $id): RedirectResponse
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        $url = $notification->data['url'] ?? null;

        return $url ? redirect()->to($url) : back();
    }

    /**
     * Mark every notification as read.
     */
    public function readAll(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        $this->toast(__('All notifications marked as read.'));

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    protected function present(DatabaseNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'title' => $notification->data['title'] ?? '',
            'body' => $notification->data['body'] ?? '',
            'url' => $notification->data['url'] ?? null,
            'icon' => $notification->data['icon'] ?? 'bell',
            'color' => $notification->data['color'] ?? 'emerald',
            'read_at' => $notification->read_at?->toIso8601String(),
            'created_at' => $notification->created_at?->toIso8601String(),
        ];
    }
}
