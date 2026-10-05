<?php

namespace App\Enums;

enum JoinRequestStatus: string
{
    case Pending = 'pending';
    case Accepted = 'accepted';
    case Rejected = 'rejected';
    case Cancelled = 'cancelled';

    public function label(): string
    {
        return match ($this) {
            self::Pending => __('Waiting for an answer'),
            self::Accepted => __('Accepted'),
            self::Rejected => __('Declined'),
            self::Cancelled => __('Cancelled'),
        };
    }
}
