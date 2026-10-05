<?php

namespace App\Http\Requests;

use App\Enums\DeedKind;
use App\Enums\SinSeverity;
use App\Services\DeedCatalog;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class DeedRequest extends FormRequest
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
        $kind = DeedKind::tryFrom((string) $this->input('kind'));

        return [
            'kind' => ['required', Rule::enum(DeedKind::class)],
            'title' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'catalog_key' => ['nullable', 'string', Rule::in($kind ? app(DeedCatalog::class)->keys($kind) : [])],
            // A sin that matches no entry of the catalog: the user says whether it is minor or major.
            'severity' => [
                Rule::requiredIf(fn (): bool => $kind === DeedKind::Bad && blank($this->input('catalog_key'))),
                'nullable',
                Rule::enum(SinSeverity::class),
            ],
            'date' => ['required', 'date_format:Y-m-d'],
            'time' => ['required', 'date_format:H:i'],
        ];
    }

    /**
     * A deed cannot be recorded in the future.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                if ($this->doneAt()->isAfter(now()->addMinutes(5))) {
                    $validator->errors()->add('time', __('A deed cannot be recorded in the future.'));
                }
            },
        ];
    }

    /**
     * When the deed was done, from the date and time of the user's timezone.
     */
    public function doneAt(): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat('Y-m-d H:i', $this->input('date').' '.$this->input('time'), $this->user()->displayTimezone());
    }

    /**
     * @return array<string, mixed>
     */
    public function attributes(): array
    {
        return [
            'title' => __('Description'),
            'severity' => __('Kind of sin'),
        ];
    }

    /**
     * The values to store.
     *
     * @return array<string, mixed>
     */
    public function deed(): array
    {
        $kind = DeedKind::from($this->validated('kind'));
        $key = $this->validated('catalog_key');
        $severity = $kind === DeedKind::Bad
            ? (app(DeedCatalog::class)->severityOf($key) ?? SinSeverity::from($this->validated('severity')))
            : null;

        return [
            'kind' => $kind,
            'title' => $this->validated('title'),
            'notes' => $this->validated('notes'),
            'catalog_key' => $key,
            'severity' => $severity,
            'done_at' => $this->doneAt()->utc(),
            'done_on' => $this->validated('date'),
        ];
    }
}
