<?php

namespace App\Http\Requests;

use App\Enums\ProgressType;
use App\Http\Requests\Concerns\ValidatesPortions;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class RecitationSubmissionRequest extends FormRequest
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
        return [
            ...$this->portionRules(graded: false),
            'notes' => ['nullable', 'string', 'max:1000'],
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

    /**
     * The submitted portions keyed by type, null for a skipped type.
     *
     * @return array<string, array{from_surah: int, from_ayah: int, to_surah: int, to_ayah: int}|null>
     */
    public function portions(): array
    {
        $portions = [];

        foreach (ProgressType::cases() as $type) {
            $key = $type->value;

            $portions[$key] = $this->filled($key) ? [
                'from_surah' => $this->integer("{$key}.from_surah"),
                'from_ayah' => $this->integer("{$key}.from_ayah"),
                'to_surah' => $this->integer("{$key}.to_surah"),
                'to_ayah' => $this->integer("{$key}.to_ayah"),
            ] : null;
        }

        return $portions;
    }
}
