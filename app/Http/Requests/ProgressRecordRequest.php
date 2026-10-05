<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Http\Requests\Concerns\ValidatesPortions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ProgressRecordRequest extends FormRequest
{
    use ValidatesPortions;

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $creating = $this->route('record') === null;

        return [
            'student_id' => [
                $creating ? 'required' : 'prohibited',
                'integer',
                Rule::exists('users', 'id')->where('role', UserRole::Student->value),
            ],
            'halaqa_id' => ['nullable', 'integer', 'exists:halaqat,id'],
            'halaqa_session_id' => ['nullable', 'integer', 'exists:halaqa_sessions,id'],
            'submission_id' => [$creating ? 'nullable' : 'prohibited', 'integer'],
            ...$this->portionRules(graded: true),
            'notes' => ['nullable', 'string', 'max:2000'],
            'recorded_on' => ['nullable', 'date', 'before_or_equal:tomorrow'],
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return $this->portionAttributes();
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return $this->portionMessages();
    }

    /**
     * Validate the ayah positions against the Quran structure.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            fn (Validator $validator) => $this->validatePortions($validator),
        ];
    }
}
