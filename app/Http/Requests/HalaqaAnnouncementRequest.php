<?php

namespace App\Http\Requests;

use App\Enums\AnnouncementDelivery;
use App\Enums\AnnouncementKind;
use App\Enums\SessionStatus;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class HalaqaAnnouncementRequest extends FormRequest
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
        $halaqaId = $this->route('halaqa')?->id ?? $this->route('announcement')?->halaqa_id;

        return [
            'kind' => ['required', Rule::enum(AnnouncementKind::class)],
            'title' => ['nullable', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:5000'],
            'delivery' => ['required', Rule::enum(AnnouncementDelivery::class)],
            'date' => ['required_if:delivery,'.AnnouncementDelivery::Scheduled->value, 'nullable', 'date_format:Y-m-d'],
            'time' => ['required_if:delivery,'.AnnouncementDelivery::Scheduled->value, 'nullable', 'date_format:H:i'],
            'session_ids' => ['required_if:delivery,'.AnnouncementDelivery::Sessions->value, 'nullable', 'array'],
            'session_ids.*' => [
                'integer',
                Rule::exists('halaqa_sessions', 'id')
                    ->where('halaqa_id', $halaqaId)
                    ->whereIn('status', [SessionStatus::Scheduled->value, SessionStatus::Live->value]),
            ],
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
            'body' => __('message'),
            'session_ids' => __('sessions'),
        ];
    }

    /**
     * A scheduled message must be planned for later.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isEmpty()
                    && $this->deliveryMode() === AnnouncementDelivery::Scheduled
                    && $this->scheduledAt()->isPast()) {
                    $validator->errors()->add('time', __('Choose a time in the future.'));
                }
            },
        ];
    }

    public function deliveryMode(): AnnouncementDelivery
    {
        return AnnouncementDelivery::from($this->input('delivery'));
    }

    /**
     * The delivery time converted from the user's timezone to UTC.
     */
    public function scheduledAt(): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat(
            'Y-m-d H:i',
            $this->input('date').' '.$this->input('time'),
            $this->user()->displayTimezone(),
        )->utc();
    }
}
