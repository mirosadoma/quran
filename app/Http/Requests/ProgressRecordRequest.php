<?php

namespace App\Http\Requests;

use App\Enums\Grade;
use App\Enums\ProgressType;
use App\Enums\UserRole;
use App\Services\Quran;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ProgressRecordRequest extends FormRequest
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
            'student_id' => [
                $this->route('record') ? 'prohibited' : 'required',
                'integer',
                Rule::exists('users', 'id')->where('role', UserRole::Student->value),
            ],
            'halaqa_id' => ['nullable', 'integer', 'exists:halaqat,id'],
            'halaqa_session_id' => ['nullable', 'integer', 'exists:halaqa_sessions,id'],
            'type' => ['required', Rule::enum(ProgressType::class)],
            'from_surah' => ['required', 'integer', 'between:1,114'],
            'from_ayah' => ['required', 'integer', 'min:1'],
            'to_surah' => ['required', 'integer', 'between:1,114'],
            'to_ayah' => ['required', 'integer', 'min:1'],
            'grade' => ['nullable', Rule::enum(Grade::class)],
            'mistakes' => ['nullable', 'integer', 'min:0', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'recorded_on' => ['nullable', 'date', 'before_or_equal:tomorrow'],
        ];
    }

    /**
     * Validate the ayah positions against the Quran structure.
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

                $quran = app(Quran::class);
                $fromSurah = $this->integer('from_surah');
                $toSurah = $this->integer('to_surah');

                if (! $quran->isValid($fromSurah, $this->integer('from_ayah'))) {
                    $validator->errors()->add('from_ayah', __('Surah :surah has only :count ayahs.', [
                        'surah' => $quran->surahName($fromSurah),
                        'count' => $quran->ayahCount($fromSurah),
                    ]));
                }

                if (! $quran->isValid($toSurah, $this->integer('to_ayah'))) {
                    $validator->errors()->add('to_ayah', __('Surah :surah has only :count ayahs.', [
                        'surah' => $quran->surahName($toSurah),
                        'count' => $quran->ayahCount($toSurah),
                    ]));
                }

                if ($validator->errors()->isEmpty()
                    && $quran->absolute($fromSurah, $this->integer('from_ayah')) > $quran->absolute($toSurah, $this->integer('to_ayah'))) {
                    $validator->errors()->add('to_ayah', __('The end of the portion must come after its start.'));
                }
            },
        ];
    }
}
