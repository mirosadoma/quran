<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class DhikrRequest extends FormRequest
{
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
            'dhikr_category_id' => ['required', 'integer', 'exists:adhkar_categories,id'],
            'title' => ['nullable', 'string', 'max:150'],
            'text' => ['required', 'string', 'max:5000'],
            'repeat' => ['required', 'integer', 'min:1', 'max:1000'],
            'reference' => ['nullable', 'string', 'max:255'],
            'virtue' => ['nullable', 'string', 'max:2000'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:1000'],
            'is_active' => ['boolean'],
        ];
    }
}
