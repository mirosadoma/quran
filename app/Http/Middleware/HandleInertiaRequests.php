<?php

namespace App\Http\Middleware;

use App\Models\Setting;
use App\Services\ChatService;
use App\Services\Realtime;
use App\Services\WebPush\WebPush;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'app' => fn (): array => [
                'name' => Setting::get('academy_name'),
                'tagline' => Setting::get('academy_tagline'),
                'logo_url' => ($logo = Setting::get('academy_logo')) ? Storage::disk('public')->url($logo) : null,
            ],
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $user->role->value,
                    'gender' => $user->gender?->value,
                    'avatar_url' => $user->avatar_url,
                    'timezone' => $user->displayTimezone(),
                ] : null,
            ],
            'push' => fn (): array => [
                'public_key' => $user && Setting::get('notify_push') && app(WebPush::class)->isConfigured() ? app(WebPush::class)->publicKey() : null,
            ],
            'locale' => app()->getLocale(),
            'timezone' => $user?->displayTimezone() ?? config('app.user_timezone'),
            'csrf_token' => csrf_token(),
            'counts' => fn (): ?array => $user ? [
                'notifications' => $user->unreadNotifications()->count(),
                'chat' => app(ChatService::class)->unreadCount($user),
            ] : null,
            'realtime' => fn (): array => [
                ...Realtime::clientConfig(),
                'halaqa_ids' => $user && ! $user->isAdmin() && Realtime::enabled()
                    ? $user->accessibleHalaqat()->pluck('id')->all()
                    : [],
            ],
        ];
    }
}
