<?php

namespace App\Http\Requests;

use App\Models\Halaqa;
use App\Models\Video;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class VideoRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('create', Video::class);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'url' => ['required', 'string', 'max:500', function (string $attribute, mixed $value, Closure $fail): void {
                if (Video::youtubeId((string) $value) === null) {
                    $fail(__('Enter a valid YouTube link.'));
                }
            }],
            'halaqa_id' => [$this->user()?->isTeacher() ? 'required' : 'nullable', 'integer', 'exists:halaqat,id'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_published' => ['boolean'],
            'notify' => ['boolean'],
        ];
    }

    /**
     * Teachers can only publish videos for their own halaqat.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $user = $this->user();

                if ($user->isTeacher() && $this->filled('halaqa_id')
                    && ! Halaqa::query()->whereKey($this->integer('halaqa_id'))->where('teacher_id', $user->id)->exists()) {
                    $validator->errors()->add('halaqa_id', __('You can only add videos to your own halaqat.'));
                }
            },
        ];
    }
}
