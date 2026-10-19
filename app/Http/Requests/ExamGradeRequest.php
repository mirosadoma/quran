<?php

namespace App\Http\Requests;

use App\Enums\Grade;
use App\Models\ExamEntry;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The result of a student: a grade, a score out of the exam's maximum, and notes.
 * Authorization is done by the controller (the examiner may be an outside guest).
 */
class ExamGradeRequest extends FormRequest
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
        $entry = $this->route('entry');
        $max = $entry instanceof ExamEntry ? ($entry->day?->exam?->max_score ?? 100) : 100;

        return [
            'grade' => ['nullable', Rule::enum(Grade::class)],
            'score' => ['nullable', 'integer', 'min:0', "max:{$max}"],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function grade(): ?Grade
    {
        return $this->filled('grade') ? Grade::from((string) $this->input('grade')) : null;
    }

    public function score(): ?int
    {
        return $this->filled('score') ? $this->integer('score') : null;
    }

    public function notes(): ?string
    {
        return $this->filled('notes') ? trim((string) $this->input('notes')) : null;
    }
}
