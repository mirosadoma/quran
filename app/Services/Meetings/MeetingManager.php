<?php

namespace App\Services\Meetings;

use App\Enums\MeetingProvider;
use App\Exceptions\MeetingException;
use App\Models\HalaqaSession;
use App\Models\Setting;
use App\Models\User;
use App\Services\Meetings\Drivers\GoogleMeetDriver;
use App\Services\Meetings\Drivers\JitsiDriver;
use App\Services\Meetings\Drivers\ManualDriver;
use App\Services\Meetings\Drivers\ZoomDriver;
use Illuminate\Contracts\Container\Container;
use Throwable;

/**
 * Entry point for everything related to session meetings.
 */
class MeetingManager
{
    public function __construct(protected Container $container) {}

    public function driver(MeetingProvider $provider): MeetingDriver
    {
        return $this->container->make(match ($provider) {
            MeetingProvider::GoogleMeet => GoogleMeetDriver::class,
            MeetingProvider::Zoom => ZoomDriver::class,
            MeetingProvider::Jitsi => JitsiDriver::class,
            MeetingProvider::Manual => ManualDriver::class,
        });
    }

    public function defaultProvider(): MeetingProvider
    {
        return MeetingProvider::tryFrom((string) Setting::get('meeting_provider')) ?? MeetingProvider::Jitsi;
    }

    /**
     * Create the external meeting when the session does not have one yet.
     *
     * @throws MeetingException
     */
    public function ensure(HalaqaSession $session): bool
    {
        if (filled($session->meeting_url)) {
            return true;
        }

        $details = $this->driver($session->meeting_provider)->create($session);

        $session->forceFill($details->toAttributes())->save();

        return filled($session->meeting_url);
    }

    /**
     * Same as ensure() but failures are only reported.
     */
    public function tryEnsure(HalaqaSession $session): bool
    {
        try {
            return $this->ensure($session);
        } catch (Throwable $exception) {
            report($exception);

            return false;
        }
    }

    public function sync(HalaqaSession $session): void
    {
        rescue(fn () => $this->driver($session->meeting_provider)->update($session));
    }

    public function release(HalaqaSession $session): void
    {
        rescue(fn () => $this->driver($session->meeting_provider)->delete($session));
    }

    public function end(HalaqaSession $session): void
    {
        rescue(fn () => $this->driver($session->meeting_provider)->end($session));
    }

    /**
     * @throws MeetingException
     */
    public function joinTarget(HalaqaSession $session, User $user): JoinTarget
    {
        $this->ensure($session);

        return $this->driver($session->meeting_provider)->joinTarget($session, $user);
    }

    /**
     * Determine whether the provider's meeting opens inside the platform.
     */
    public function isEmbedded(MeetingProvider $provider): bool
    {
        $driver = $this->driver($provider);

        return $driver instanceof JitsiDriver && $driver->isEmbedded();
    }

    /**
     * Status of every provider for the settings and halaqa forms.
     *
     * @return list<array{value: string, label: string, configured: bool}>
     */
    public function providers(): array
    {
        return array_map(fn (MeetingProvider $provider): array => [
            'value' => $provider->value,
            'label' => $provider->label(),
            'configured' => $this->driver($provider)->isConfigured(),
        ], MeetingProvider::cases());
    }
}
