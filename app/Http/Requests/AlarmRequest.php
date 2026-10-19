<?php

namespace App\Http\Requests;

use App\Enums\AlarmKind;
use App\Models\Alarm;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AlarmRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $alarm = $this->route('alarm');

        return ! $alarm instanceof Alarm || $this->user()->can('update', $alarm);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'kind' => ['required', Rule::enum(AlarmKind::class)],
            'title' => ['required', 'string', 'max:100'],
            'time' => ['required', 'date_format:H:i'],
            'days' => ['nullable', 'array', 'max:7'],
            'days.*' => ['integer', 'between:0,6'],
            'is_active' => ['boolean'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function attributes(): array
    {
        return [
            'kind' => __('the kind'),
            'title' => __('the name'),
            'time' => __('the time'),
            'days' => __('the days'),
        ];
    }

    /**
     * The attributes of the alarm (null days = every day).
     *
     * @return array<string, mixed>
     */
    public function alarmAttributes(): array
    {
        $days = collect($this->input('days', []))->map(fn ($day): int => (int) $day)->unique()->sort()->values();

        return [
            'kind' => AlarmKind::from((string) $this->input('kind')),
            'title' => trim((string) $this->input('title')),
            'ring_at' => $this->input('time'),
            'days' => $days->isEmpty() || $days->count() === 7 ? null : $days->all(),
            'is_active' => $this->boolean('is_active', true),
        ];
    }
}
