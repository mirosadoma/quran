<?php

namespace App\Exceptions;

use Exception;

/**
 * Thrown when an exam action is not possible right now (the day is closed, another student
 * is being examined...). The message is safe to show to the user.
 */
class ExamException extends Exception
{
    //
}
