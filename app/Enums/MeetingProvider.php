<?php

namespace App\Enums;

enum MeetingProvider: string
{
    case GoogleMeet = 'google_meet';
    case Zoom = 'zoom';
    case Jitsi = 'jitsi';
    case Manual = 'manual';

    public function label(): string
    {
        return match ($this) {
            self::GoogleMeet => 'Google Meet',
            self::Zoom => 'Zoom',
            self::Jitsi => 'Jitsi Meet',
            self::Manual => __('Manual link'),
        };
    }
}
