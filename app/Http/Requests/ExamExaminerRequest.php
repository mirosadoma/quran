<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use App\Models\ExamDay;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExamExaminerRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $day = $this->route('day');

        return $day instanceof ExamDay && $this->user()->can('update', $day->exam);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        /** @var ExamDay $day */
        $day = $this->route('day');

        return [
            // A teacher or the manager of the academy, or nobody for an examiner from outside.
            'user_id' => [
                'nullable',
                'integer',
                Rule::exists('users', 'id')
                    ->whereIn('role', [UserRole::Teacher->value, UserRole::Manager->value])
                    ->where('academy_id', $day->exam->academy_id),
                Rule::unique('exam_examiners', 'user_id')->where('exam_day_id', $day->id),
            ],
            'name' => ['required_without:user_id', 'nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
        ];
    }
}
