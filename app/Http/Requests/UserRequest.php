<?php

namespace App\Http\Requests;

use App\Enums\Gender;
use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return (bool) $this->user()?->isAdmin();
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => $this->filled('email') ? Str::lower(trim((string) $this->input('email'))) : null,
            'phone' => User::normalizePhone($this->input('phone')),
            'guardian_phone' => User::normalizePhone($this->input('guardian_phone')),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->route('user');

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'required_without:phone', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user)],
            'phone' => ['nullable', 'required_without:email', 'string', 'regex:/^\+?[0-9]{7,15}$/', Rule::unique('users', 'phone')->ignore($user)],
            'password' => [$user ? 'nullable' : 'required', 'string', Password::min(8)],
            'role' => ['required', Rule::enum(UserRole::class)],
            'gender' => ['nullable', Rule::enum(Gender::class)],
            'birth_date' => ['nullable', 'date', 'before:today'],
            'country' => ['nullable', 'string', 'max:80'],
            'timezone' => ['required', 'timezone:all'],
            'locale' => ['required', Rule::in(config('app.supported_locales'))],
            'bio' => ['nullable', 'string', 'max:2000'],
            'guardian_name' => ['nullable', 'string', 'max:255'],
            'guardian_phone' => ['nullable', 'string', 'regex:/^\+?[0-9]{7,15}$/'],
            'zoom_user_id' => ['nullable', 'string', 'max:255'],
            'admin_notes' => ['nullable', 'string', 'max:5000'],
            'is_active' => ['boolean'],
            'notify_email' => ['boolean'],
            'notify_whatsapp' => ['boolean'],
            'avatar' => ['nullable', 'image', 'max:2048'],
            'remove_avatar' => ['boolean'],
            'halaqat' => ['array'],
            'halaqat.*' => ['integer', 'exists:halaqat,id'],
            'send_credentials' => ['boolean'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'phone.regex' => __('Enter a valid phone number (digits only, with the country code if possible).'),
            'guardian_phone.regex' => __('Enter a valid phone number (digits only, with the country code if possible).'),
        ];
    }
}
