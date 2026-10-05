<?php

namespace App\Http\Requests;

use App\Enums\MeetingProvider;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SessionRequest extends FormRequest
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
            'halaqa_id' => [$this->route('session') ? 'prohibited' : 'required', 'integer', 'exists:halaqat,id'],
            'title' => ['nullable', 'string', 'max:255'],
            'date' => ['required', 'date_format:Y-m-d'],
            'time' => ['required', 'date_format:H:i'],
            'duration_minutes' => ['required', 'integer', 'min:10', 'max:300'],
            'meeting_provider' => ['nullable', Rule::enum(MeetingProvider::class)],
            'meeting_url' => ['nullable', 'url', 'max:500'],
            'notify' => ['boolean'],
        ];
    }

    /**
     * The start time converted from the user's timezone to UTC.
     */
    public function startsAt(): CarbonImmutable
    {
        return CarbonImmutable::createFromFormat(
            'Y-m-d H:i',
            $this->input('date').' '.$this->input('time'),
            $this->user()->timezone ?: config('app.user_timezone'),
        )->utc();
    }
}
