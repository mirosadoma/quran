<?php

namespace App\Enums;

/**
 * When a halaqa message reaches the students.
 */
enum AnnouncementDelivery: string
{
    /** Right away. */
    case Now = 'now';

    /** At a chosen date and time. */
    case Scheduled = 'scheduled';

    /** When each of the chosen sessions starts. */
    case Sessions = 'sessions';
}
