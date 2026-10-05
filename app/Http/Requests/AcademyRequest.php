<?php

namespace App\Http\Requests;

use App\Enums\HalaqaGender;
use App\Models\Academy;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * An academy and, for the administration, the account of its manager.
 */
class AcademyRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $academy = $this->route('academy');

        return $academy instanceof Academy ? $this->user()->can('update', $academy) : $this->user()->can('create', Academy::class);
    }

    protected function prepareForValidation(): void
    {
        $manager = (array) $this->input('manager', []);

        $this->merge([
            'email' => $this->filled('email') ? Str::lower(trim((string) $this->input('email'))) : null,
            'phone' => User::normalizePhone($this->input('phone')),
            'manager' => [
                ...$manager,
                'email' => filled($manager['email'] ?? null) ? Str::lower(trim((string) $manager['email'])) : null,
                'phone' => User::normalizePhone($manager['phone'] ?? null),
            ],
        ]);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $academy = $this->route('academy');
        $managerId = $academy instanceof Academy ? $academy->manager_id : null;
        // The administration sets the manager's account: required for a new academy.
        $withManager = $this->user()->isAdmin() && ($managerId === null ? $this->filled('manager.name') || ! $academy : true);

        return [
            'name' => ['required', 'string', 'max:120'],
            'tagline' => ['nullable', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:3000'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'regex:/^\+?[0-9]{7,15}$/'],
            'location' => ['nullable', 'string', 'max:120'],
            'gender' => ['required', Rule::enum(HalaqaGender::class)],
            'timezone' => ['nullable', 'timezone:all'],
            'accepts_requests' => ['boolean'],
            'is_active' => ['boolean'],
            'logo' => ['nullable', 'image', 'max:2048'],
            'remove_logo' => ['boolean'],
            'manager' => ['array'],
            'manager.name' => [$withManager ? 'required' : 'nullable', 'string', 'max:255'],
            'manager.email' => [
                'nullable',
                Rule::requiredIf($withManager && blank($this->input('manager.phone'))),
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($managerId),
            ],
            'manager.phone' => ['nullable', 'string', 'regex:/^\+?[0-9]{7,15}$/', Rule::unique('users', 'phone')->ignore($managerId)],
            'manager.password' => [$withManager && $managerId === null ? 'required' : 'nullable', 'string', Password::min(8)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'manager.name' => __('manager name'),
            'manager.email' => __('manager email'),
            'manager.phone' => __('manager phone'),
            'manager.password' => __('manager password'),
        ];
    }

    /**
     * Whether the request sets the manager's account.
     */
    public function hasManager(): bool
    {
        return $this->user()->isAdmin() && filled($this->validated('manager.name'));
    }
}
