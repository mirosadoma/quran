<?php

namespace App\Http\Requests;

use App\Models\Exam;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ExamRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $exam = $this->route('exam');

        return $exam instanceof Exam ? $this->user()->can('update', $exam) : $this->user()->can('create', Exam::class);
    }

    /**
     * The academy of the exam: the manager's own, chosen by the administration for a new exam,
     * and fixed once the exam exists.
     */
    public function academyId(): ?int
    {
        $exam = $this->route('exam');

        return match (true) {
            $exam instanceof Exam => $exam->academy_id,
            $this->user()->isManager() => $this->user()->academy_id,
            default => $this->integer('academy_id') ?: null,
        };
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'academy_id' => [
                $this->user()->isAdmin() && ! $this->route('exam') ? 'required' : 'nullable',
                'integer',
                Rule::exists('academies', 'id')->whereNull('deleted_at'),
            ],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'max_score' => ['required', 'integer', 'min:1', 'max:1000'],
            'days' => ['required', 'array', 'min:1', 'max:30'],
            'days.*.id' => ['nullable', 'integer'],
            'days.*.date' => ['required', 'date_format:Y-m-d'],
            'days.*.start_time' => ['required', 'date_format:H:i'],
            'days.*.end_time' => ['nullable', 'date_format:H:i'],
            'days.*.halaqa_ids' => ['required', 'array', 'min:1'],
            'days.*.halaqa_ids.*' => ['integer', Rule::exists('halaqat', 'id')->where('academy_id', $this->academyId())],
        ];
    }

    /**
     * Get custom attributes for validator errors.
     *
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'days.*.date' => __('the date'),
            'days.*.start_time' => __('the start time'),
            'days.*.end_time' => __('the end time'),
            'days.*.halaqa_ids' => __('the halaqat'),
        ];
    }

    /**
     * Get the "after" validation callables for the request.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                foreach ($this->input('days', []) as $index => $day) {
                    if (filled($day['end_time'] ?? null) && $day['end_time'] <= $day['start_time']) {
                        $validator->errors()->add("days.{$index}.end_time", __('The end time must be after the start time.'));
                    }
                }
            },
        ];
    }

    /**
     * The days with their start and end moments in UTC (entered in the academy's timezone).
     *
     * @return list<array{id: int|null, starts_at: Carbon, ends_at: Carbon|null, halaqa_ids: list<int>}>
     */
    public function days(string $timezone): array
    {
        return collect($this->validated('days'))->map(fn (array $day): array => [
            'id' => isset($day['id']) ? (int) $day['id'] : null,
            'starts_at' => Carbon::parse($day['date'].' '.$day['start_time'], $timezone)->utc(),
            'ends_at' => filled($day['end_time'] ?? null) ? Carbon::parse($day['date'].' '.$day['end_time'], $timezone)->utc() : null,
            'halaqa_ids' => array_values(array_unique(array_map('intval', $day['halaqa_ids']))),
        ])->values()->all();
    }
}
