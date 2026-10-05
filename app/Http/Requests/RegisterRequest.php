<?php

namespace App\Http\Requests;

use App\Enums\Gender;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * A visitor creates their own account (a student without academy).
 */
class RegisterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => $this->filled('email') ? Str::lower(trim((string) $this->input('email'))) : null,
            'phone' => User::normalizePhone($this->input('phone')),
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'required_without:phone', 'email', 'max:255', Rule::unique('users', 'email')],
            'phone' => ['nullable', 'required_without:email', 'string', 'regex:/^\+?[0-9]{7,15}$/', Rule::unique('users', 'phone')],
            'gender' => ['nullable', Rule::enum(Gender::class)],
            'password' => ['required', 'string', 'confirmed', Password::min(8)],
            'terms' => ['accepted'],
            'academy' => ['nullable', 'string', 'max:255'],
        ];
    }
}
