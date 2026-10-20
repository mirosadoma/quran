<?php

namespace App\Enums;

/**
 * The two libraries of stories (the stories table, installed from database/data/stories/{kind} by StorySeeder).
 */
enum StoryKind: string
{
    case Kids = 'kids';
    case Prophets = 'prophets';
}
