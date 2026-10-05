<?php

namespace App\Services\WhatsApp;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Sends messages through the official WhatsApp Cloud API (Meta), or writes
 * them to the log when the "log" driver is used.
 */
class WhatsAppClient
{
    public function isConfigured(): bool
    {
        return config('services.whatsapp.driver') === 'cloud'
            && filled(config('services.whatsapp.token'))
            && filled(config('services.whatsapp.phone_number_id'));
    }

    public function send(string $to, WhatsAppMessage $message): void
    {
        $to = $this->normalize($to);

        if ($to === '') {
            return;
        }

        if (config('services.whatsapp.driver') !== 'cloud') {
            Log::info('WhatsApp message', ['to' => $to, 'template' => $message->template, 'text' => $message->text]);

            return;
        }

        $config = config('services.whatsapp');
        $templateName = $message->template ? ($config['templates'][$message->template] ?? null) : null;

        $payload = filled($templateName)
            ? [
                'messaging_product' => 'whatsapp',
                'to' => $to,
                'type' => 'template',
                'template' => [
                    'name' => $templateName,
                    'language' => ['code' => $config['template_language']],
                    'components' => [[
                        'type' => 'body',
                        'parameters' => [['type' => 'text', 'text' => $this->singleLine($message->text)]],
                    ]],
                ],
            ]
            : [
                'messaging_product' => 'whatsapp',
                'to' => $to,
                'type' => 'text',
                'text' => ['body' => $message->text, 'preview_url' => true],
            ];

        Http::withToken((string) $config['token'])
            ->timeout(15)
            ->post("https://graph.facebook.com/{$config['api_version']}/{$config['phone_number_id']}/messages", $payload)
            ->throw();
    }

    /**
     * Convert a phone number to the international digits-only format.
     */
    public function normalize(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '00')) {
            return substr($digits, 2);
        }

        if (str_starts_with($digits, '0')) {
            return config('services.whatsapp.default_country_code').substr($digits, 1);
        }

        return $digits;
    }

    /**
     * Template parameters may not contain new lines or long runs of spaces.
     */
    protected function singleLine(string $text): string
    {
        return trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
    }
}
