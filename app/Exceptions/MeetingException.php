<?php

namespace App\Exceptions;

use Exception;

/**
 * Thrown when a meeting provider is not configured or rejects a request.
 * The message is safe to show to the user.
 */
class MeetingException extends Exception
{
    //
}
