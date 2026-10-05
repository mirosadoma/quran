<?php

namespace App\Http\Requests;

use App\Enums\MeetingProvider;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SettingsRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'academy_name' => ['required', 'string', 'max:100'],
            'academy_tagline' => ['nullable', 'string', 'max:200'],
            'contact_email' => ['nullable', 'email', 'max:255'],
            'contact_phone' => ['nullable', 'string', 'max:30'],
            'default_timezone' => ['required', 'timezone:all'],
            'meeting_provider' => ['required', Rule::enum(MeetingProvider::class)],
            'generate_days_ahead' => ['required', 'integer', 'between:1,60'],
            'reminder_minutes' => ['required', 'integer', 'between:0,240'],
            'late_after_minutes' => ['required', 'integer', 'between:0,120'],
            'auto_mark_absent' => ['boolean'],
            'auto_start_sessions' => ['boolean'],
            'notify_email' => ['boolean'],
            'notify_whatsapp' => ['boolean'],
            'notify_push' => ['boolean'],
            'logo' => ['nullable', 'image', 'max:2048'],
            'remove_logo' => ['boolean'],
        ];
    }
}
