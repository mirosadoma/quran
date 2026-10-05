<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use App\Services\AppIcons;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ManifestController extends Controller
{
    /**
     * The web app manifest that makes the platform installable (PWA), named after the academy.
     */
    public function __invoke(Request $request, AppIcons $icons): JsonResponse
    {
        $locale = $request->query('lang');

        if (! in_array($locale, config('app.supported_locales'), true)) {
            $locale = config('app.locale');
        }

        app()->setLocale($locale);

        $name = (string) Setting::get('academy_name');
        $urls = $icons->urls();

        return response()->json([
            'id' => '/',
            'name' => $name,
            'short_name' => $name,
            'description' => Setting::get('academy_tagline') ?: __('Quran memorization platform'),
            'lang' => $locale,
            'dir' => $locale === 'ar' ? 'rtl' : 'ltr',
            'start_url' => route('dashboard', absolute: false),
            'scope' => '/',
            'display' => 'standalone',
            'background_color' => '#f6f3ec',
            'theme_color' => '#0b3b31',
            'categories' => ['education'],
            'icons' => [
                ['src' => $urls['icon-192'], 'sizes' => '192x192', 'type' => 'image/png', 'purpose' => 'any'],
                ['src' => $urls['icon-512'], 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'any'],
                ['src' => $urls['icon-maskable-512'], 'sizes' => '512x512', 'type' => 'image/png', 'purpose' => 'maskable'],
            ],
            'shortcuts' => [
                ['name' => __('Sessions'), 'url' => route('sessions.index', absolute: false)],
                ['name' => __('Chat'), 'url' => route('chat.index', absolute: false)],
                ['name' => __('Notifications'), 'url' => route('notifications.index', absolute: false)],
            ],
        ], options: JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
            ->header('Content-Type', 'application/manifest+json')
            ->header('Cache-Control', 'public, max-age=3600');
    }
}
