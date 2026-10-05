<?php

namespace App\Enums;

/**
 * Colors a reader can mark an ayah with in the mushaf.
 */
enum HighlightColor: string
{
    case Gold = 'gold';
    case Emerald = 'emerald';
    case Sky = 'sky';
    case Rose = 'rose';
    case Violet = 'violet';
}
