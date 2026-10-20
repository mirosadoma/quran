<?php

namespace App\Http\Controllers;

use App\Http\Requests\MailSettingsRequest;
use App\Mail\TestEmail;
use App\Models\Setting;
use App\Services\MailSettings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Throwable;

class MailSettingsController extends Controller
{
    /**
     * Save the outgoing email settings and put them to use on the whole server.
     */
    public function update(MailSettingsRequest $request, MailSettings $mail): RedirectResponse
    {
        $mail->save($request->validated());
        $mail->refresh();

        $this->toast(__('Email settings saved. They are in use right away, and the queue workers were restarted.'));

        return back();
    }

    /**
     * Send a test email to the administrator with the saved settings, and tell what went wrong when it fails.
     */
    public function test(Request $request, MailSettings $mail): RedirectResponse
    {
        $to = $request->user()->email;

        if ($to === null) {
            $this->toast(__('Add an email to your profile first: the test email is sent to it.'), 'error');

            return back();
        }

        try {
            Mail::to($to)->send(new TestEmail((string) Setting::get('academy_name')));
        } catch (Throwable $exception) {
            report($exception);
            $this->toast(__('The test email could not be sent: :error', ['error' => $exception->getMessage()]), 'error');

            return back();
        }

        $this->toast($mail->effective()['mailer'] === 'log'
            ? __('The mailer is "log": the test email was written to the log file, not sent.')
            : __('A test email was sent to :email. Check the inbox and the spam folder.', ['email' => $to]), $mail->effective()['mailer'] === 'log' ? 'warning' : 'success');

        return back();
    }
}
