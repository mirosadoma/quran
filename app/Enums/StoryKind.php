<?php

namespace App\Enums;

/**
 * The two libraries of stories: each one is a folder of resources/data/stories with one JSON file per story.
 */
enum StoryKind: string
{
    case Kids = 'kids';
    case Prophets = 'prophets';
}
