<?php

namespace App\Enums;

enum MessageType: string
{
    case Text = 'text';
    case Image = 'image';
    case Audio = 'audio';
    case File = 'file';

    /**
     * Guess the message type from an uploaded file's MIME type.
     */
    public static function fromMime(?string $mime): self
    {
        return match (true) {
            $mime === null => self::Text,
            str_starts_with($mime, 'image/') => self::Image,
            str_starts_with($mime, 'audio/'), $mime === 'video/webm' => self::Audio,
            default => self::File,
        };
    }
}
