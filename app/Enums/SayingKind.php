<?php

namespace App\Enums;

/**
 * What a transmitted saying is: a saying (or a wisdom), or a story told with its lesson.
 */
enum SayingKind: string
{
    case Saying = 'saying';
    case Story = 'story';
}
