<?php

namespace App\Http\Requests\Concerns;

use App\Enums\Grade;
use App\Enums\ProgressType;
use App\Services\Quran;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Validation of a recitation made of a memorization portion, a revision portion or both.
 * Each portion is sent under its type key: memorization[from_surah], revision[to_ayah], ...
 */
trait ValidatesPortions
{
    /**
     * @return array<string, array<mixed>>
     */
    protected function portionRules(bool $graded): array
    {
        $rules = [];

        foreach (ProgressType::cases() as $type) {
            $key = $type->value;

            $rules[$key] = ['nullable', 'array'];
            $rules["{$key}.from_surah"] = ["required_with:{$key}", 'integer', 'between:1,114'];
            $rules["{$key}.from_ayah"] = ["required_with:{$key}", 'integer', 'min:1'];
            $rules["{$key}.to_surah"] = ["required_with:{$key}", 'integer', 'between:1,114'];
            $rules["{$key}.to_ayah"] = ["required_with:{$key}", 'integer', 'min:1'];

            if ($graded) {
                $rules["{$key}.grade"] = ['nullable', Rule::enum(Grade::class)];
                $rules["{$key}.mistakes"] = ['nullable', 'integer', 'min:0', 'max:255'];
            }
        }

        return $rules;
    }

    /**
     * Readable names of the portion fields for the validation messages.
     *
     * @return array<string, string>
     */
    protected function portionAttributes(): array
    {
        $attributes = [];

        foreach (ProgressType::cases() as $type) {
            $key = $type->value;
            $replace = ['type' => $type->label()];

            $attributes[$key] = $type->label();
            $attributes["{$key}.from_surah"] = __('start surah of the :type', $replace);
            $attributes["{$key}.from_ayah"] = __('start ayah of the :type', $replace);
            $attributes["{$key}.to_surah"] = __('end surah of the :type', $replace);
            $attributes["{$key}.to_ayah"] = __('end ayah of the :type', $replace);
            $attributes["{$key}.grade"] = __('grade of the :type', $replace);
            $attributes["{$key}.mistakes"] = __('mistakes of the :type', $replace);
        }

        return $attributes;
    }

    /**
     * A clear message when a chosen portion is left incomplete.
     *
     * @return array<string, string>
     */
    protected function portionMessages(): array
    {
        $messages = [];

        foreach (ProgressType::cases() as $type) {
            foreach (['from_surah', 'from_ayah', 'to_surah', 'to_ayah'] as $field) {
                $messages["{$type->value}.{$field}.required_with"] = __('Choose the start and end of the :type.', ['type' => $type->label()]);
            }
        }

        return $messages;
    }

    /**
     * Types of the portions present in the request.
     *
     * @return list<ProgressType>
     */
    public function portionTypes(): array
    {
        return array_values(array_filter(ProgressType::cases(), fn (ProgressType $type): bool => $this->filled($type->value)));
    }

    /**
     * Require at least one portion and check every position against the Quran structure.
     */
    protected function validatePortions(Validator $validator): void
    {
        if ($validator->errors()->isNotEmpty()) {
            return;
        }

        if ($this->portionTypes() === []) {
            $validator->errors()->add('portions', __('Choose memorization, revision or both.'));

            return;
        }

        $quran = app(Quran::class);

        foreach ($this->portionTypes() as $type) {
            $key = $type->value;
            $fromSurah = $this->integer("{$key}.from_surah");
            $fromAyah = $this->integer("{$key}.from_ayah");
            $toSurah = $this->integer("{$key}.to_surah");
            $toAyah = $this->integer("{$key}.to_ayah");
            $valid = true;

            if (! $quran->isValid($fromSurah, $fromAyah)) {
                $valid = false;
                $validator->errors()->add("{$key}.from_ayah", __('Surah :surah has only :count ayahs.', [
                    'surah' => $quran->surahName($fromSurah),
                    'count' => $quran->ayahCount($fromSurah),
                ]));
            }

            if (! $quran->isValid($toSurah, $toAyah)) {
                $valid = false;
                $validator->errors()->add("{$key}.to_ayah", __('Surah :surah has only :count ayahs.', [
                    'surah' => $quran->surahName($toSurah),
                    'count' => $quran->ayahCount($toSurah),
                ]));
            }

            if ($valid && $quran->absolute($fromSurah, $fromAyah) > $quran->absolute($toSurah, $toAyah)) {
                $validator->errors()->add("{$key}.to_ayah", __('The end of the portion must come after its start.'));
            }
        }
    }
}
