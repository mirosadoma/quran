<?php

namespace App\Http\Requests;

use App\Models\ExamDay;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ExamDistributionRequest extends FormRequest
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
            'assignments' => ['required', 'array'],
            'assignments.*.entry_id' => ['required', 'integer', Rule::exists('exam_entries', 'id')->where('exam_day_id', $day->id)],
            'assignments.*.examiner_id' => ['nullable', 'integer', Rule::exists('exam_examiners', 'id')->where('exam_day_id', $day->id)],
            'assignments.*.position' => ['required', 'integer', 'min:0', 'max:1000'],
        ];
    }

    /**
     * @return list<array{entry_id: int, examiner_id: int|null, position: int}>
     */
    public function assignments(): array
    {
        return collect($this->validated('assignments'))->map(fn (array $assignment): array => [
            'entry_id' => (int) $assignment['entry_id'],
            'examiner_id' => isset($assignment['examiner_id']) && $assignment['examiner_id'] !== null && $assignment['examiner_id'] !== '' ? (int) $assignment['examiner_id'] : null,
            'position' => (int) $assignment['position'],
        ])->values()->all();
    }
}
