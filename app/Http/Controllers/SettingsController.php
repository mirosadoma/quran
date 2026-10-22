<?php

namespace App\Http\Controllers;

use App\Http\Requests\SettingsRequest;
use App\Models\Setting;
use App\Services\AppIcons;
use App\Services\Firebase\CloudMessaging;
use App\Services\MailSettings;
use App\Services\Meetings\Drivers\JitsiDriver;
use App\Services\Meetings\GoogleClient;
use App\Services\Meetings\MeetingManager;
use App\Services\Realtime;
use App\Services\WhatsApp\WhatsAppClient;
use DateTimeZone;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function __construct(
        protected MeetingManager $meetings,
        protected GoogleClient $google,
        protected WhatsAppClient $whatsApp,
        protected JitsiDriver $jitsi,
    ) {}

    /**
     * Academy settings and the status of every integration.
     */
    public function edit(MailSettings $mail): Response
    {
        $logo = Setting::get('academy_logo');

        $settings = collect(Setting::defaults())
            ->except(['google_meet', 'academy_logo', ...MailSettings::keys()])
            ->map(fn ($default, string $key) => Setting::get($key));

        return Inertia::render('settings/index', [
            'settings' => $settings,
            'mail' => $mail->summary(),
            'logoUrl' => $logo ? Storage::disk('public')->url($logo) : null,
            'providers' => $this->meetings->providers(),
            'google' => [
                'has_credentials' => $this->google->hasCredentials(),
                'connected' => $this->google->isConnected(),
                'email' => $this->google->connection()['email'] ?? null,
                'redirect_uri' => $this->google->redirectUri(),
            ],
            'integrations' => [
                'jitsi_mode' => $this->jitsi->mode(),
                'realtime' => ['enabled' => Realtime::enabled(), 'driver' => Realtime::driver()],
                'mail' => ['driver' => $mail->effective()['mailer'], 'from' => $mail->effective()['from']],
                'whatsapp' => ['driver' => config('services.whatsapp.driver'), 'configured' => $this->whatsApp->isConfigured()],
                'push' => ['configured' => app(CloudMessaging::class)->isConfigured()],
                'queue' => config('queue.default'),
                'webhooks' => [
                    'zoom' => route('webhooks.zoom'),
                    'jaas' => route('webhooks.jaas'),
                ],
            ],
            'timezones' => DateTimeZone::listIdentifiers(),
        ]);
    }

    /**
     * Save the academy settings.
     */
    public function update(SettingsRequest $request, AppIcons $icons): RedirectResponse
    {
        $values = $request->safe()->except(['logo', 'remove_logo']);

        if ($request->boolean('remove_logo') || $request->hasFile('logo')) {
            if ($current = Setting::get('academy_logo')) {
                Storage::disk('public')->delete($current);
                $icons->delete($current);
            }

            $values['academy_logo'] = null;
        }

        if ($request->hasFile('logo')) {
            $values['academy_logo'] = $request->file('logo')->store('branding', 'public');
            $icons->generate($values['academy_logo']);
        }

        Setting::put($values);

        $this->toast(__('Settings saved.'));

        return back();
    }
}
