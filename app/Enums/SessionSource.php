<?php

namespace App\Enums;

enum SessionSource: string
{
    case Schedule = 'schedule';
    case Manual = 'manual';
}
