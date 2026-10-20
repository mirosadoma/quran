<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * The email the administration sends to itself to check the outgoing email settings.
 */
class TestEmail extends Mailable
{
    public function __construct(public string $appName) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: __('Test email from :app', ['app' => $this->appName]));
    }

    public function content(): Content
    {
        return new Content(htmlString: '<p dir="auto">'.e(__('This is a test email: the email settings of :app work.', ['app' => $this->appName])).'</p>');
    }
}
