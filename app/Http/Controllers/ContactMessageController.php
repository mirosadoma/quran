<?php

namespace App\Http\Controllers;

use App\Models\ContactMessage;
use App\Models\User;
use App\Notifications\ContactMessageReceived;
use App\Services\Notifier;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Messages of the contact page, read by the administration.
 */
class ContactMessageController extends Controller
{
    public function __construct(protected Notifier $notifier) {}

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['nullable', 'required_without:phone', 'email', 'max:255'],
            'phone' => ['nullable', 'required_without:email', 'string', 'regex:/^\+?[0-9\s-]{7,20}$/'],
            'subject' => ['nullable', 'string', 'max:150'],
            'message' => ['required', 'string', 'min:10', 'max:5000'],
            // Left empty by people; filled by spam robots.
            'website' => ['prohibited'],
        ]);

        $message = ContactMessage::query()->create([
            ...collect($validated)->except('website')->all(),
            'user_id' => $request->user()?->id,
        ]);

        $this->notifier->send(User::query()->admins()->active()->get(), new ContactMessageReceived($message));

        $this->toast(__('Your message was sent. We will reply soon, God willing.'));

        return back();
    }

    public function index(Request $request): Response
    {
        $unread = $request->query('filter') === 'unread';

        $messages = ContactMessage::query()
            ->when($unread, fn (Builder $query) => $query->unread())
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (ContactMessage $message): array => [
                'id' => $message->id,
                'name' => $message->name,
                'email' => $message->email,
                'phone' => $message->phone,
                'subject' => $message->subject,
                'message' => $message->message,
                'read_at' => $message->read_at?->toIso8601String(),
                'created_at' => $message->created_at?->toIso8601String(),
                'user_id' => $message->user_id,
            ]);

        return Inertia::render('contact-messages/index', [
            'messages' => $messages,
            'filters' => ['filter' => $unread ? 'unread' : 'all'],
            'unread' => ContactMessage::query()->unread()->count(),
        ]);
    }

    /**
     * Mark a message read, or unread again.
     */
    public function read(ContactMessage $message): RedirectResponse
    {
        $message->update(['read_at' => $message->read_at ? null : now()]);

        return back();
    }

    public function destroy(ContactMessage $message): RedirectResponse
    {
        $message->delete();

        $this->toast(__('Message deleted.'));

        return back();
    }
}
