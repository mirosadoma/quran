<?php

namespace App\Services\WhatsApp;

/**
 * A WhatsApp message: plain text, optionally delivered through an approved template.
 */
final class WhatsAppMessage
{
    public function __construct(
        public string $text,
        public ?string $template = null,
    ) {}

    public static function make(string $text): self
    {
        return new self($text);
    }

    /**
     * Key of the template in config('services.whatsapp.templates').
     */
    public function template(?string $template): self
    {
        $this->template = $template;

        return $this;
    }
}
