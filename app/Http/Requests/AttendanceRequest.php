<?php

namespace App\Http\Requests;

use App\Enums\AttendanceStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AttendanceRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('update', $this->route('session'));
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'attendances' => ['required', 'array'],
            'attendances.*.student_id' => ['required', 'integer'],
            'attendances.*.status' => ['nullable', Rule::enum(AttendanceStatus::class)],
            'attendances.*.notes' => ['nullable', 'string', 'max:255'],
        ];
    }
}
