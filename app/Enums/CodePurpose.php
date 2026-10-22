<?php

namespace App\Enums;

/**
 * What a one-time code (OTP) sent by the platform is for.
 */
enum CodePurpose: string
{
    case PasswordReset = 'password_reset';
}
