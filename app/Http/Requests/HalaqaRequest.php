<?php

namespace App\Http\Requests;

use App\Enums\Gender;
use App\Enums\HalaqaGender;
use App\Enums\HalaqaLevel;
use App\Enums\MeetingProvider;
use App\Enums\UserRole;
use App\Models\Halaqa;
use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class HalaqaRequest extends FormRequest
{
    /**
     * Colors available for halaqat in the interface.
     *
     * @var list<string>
     */
    public const COLORS = ['emerald', 'teal', 'sky', 'indigo', 'violet', 'rose', 'amber', 'lime'];

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $halaqa = $this->route('halaqa');

        return $halaqa instanceof Halaqa ? $this->user()->can('update', $halaqa) : $this->user()->can('create', Halaqa::class);
    }

    /**
     * The academy of the halaqa: the manager's own, chosen by the administration for a new halaqa,
     * and fixed once the halaqa exists.
     */
    public function academyId(): ?int
    {
        $halaqa = $this->route('halaqa');

        return match (true) {
            $halaqa instanceof Halaqa => $halaqa->academy_id,
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
                $this->user()->isAdmin() && ! $this->route('halaqa') ? 'required' : 'nullable',
                'integer',
                Rule::exists('academies', 'id')->whereNull('deleted_at'),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            // Teachers and students of the halaqa's academy.
            'teacher_id' => ['nullable', 'integer', Rule::exists('users', 'id')->where('role', UserRole::Teacher->value)->where('academy_id', $this->academyId())],
            'gender' => ['required', Rule::enum(HalaqaGender::class)],
            'level' => ['nullable', Rule::enum(HalaqaLevel::class)],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:500'],
            'schedule' => ['array', 'max:14'],
            'schedule.*.day' => ['required', 'integer', 'between:0,6'],
            'schedule.*.time' => ['required', 'date_format:H:i'],
            'duration_minutes' => ['required', 'integer', 'min:10', 'max:300'],
            'timezone' => ['required', 'timezone:all'],
            'meeting_provider' => ['required', Rule::enum(MeetingProvider::class)],
            'meeting_url' => ['nullable', 'url', 'max:500'],
            'color' => ['required', Rule::in(self::COLORS)],
            'starts_on' => ['nullable', 'date'],
            'is_active' => ['boolean'],
            'student_ids' => ['array'],
            'student_ids.*' => ['integer', Rule::exists('users', 'id')->where('role', UserRole::Student->value)->where('academy_id', $this->academyId())],
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

                $studentIds = collect($this->input('student_ids', []))->unique();
                $capacity = $this->integer('capacity');

                if ($capacity > 0 && $studentIds->count() > $capacity) {
                    $validator->errors()->add('student_ids', __('The halaqa capacity is :capacity students.', ['capacity' => $capacity]));
                }

                $gender = HalaqaGender::from((string) $this->input('gender'));

                $mismatched = User::query()
                    ->whereIn('id', $studentIds)
                    ->whereNotNull('gender')
                    ->get(['id', 'name', 'gender'])
                    ->reject(fn (User $student): bool => $gender->accepts($student->gender instanceof Gender ? $student->gender : null));

                if ($mismatched->isNotEmpty()) {
                    $validator->errors()->add('student_ids', __('These students do not match the halaqa category: :names', [
                        'names' => $mismatched->pluck('name')->implode('، '),
                    ]));
                }

                $slots = collect($this->input('schedule', []))->map(fn (array $slot): string => $slot['day'].'-'.$slot['time']);

                if ($slots->duplicates()->isNotEmpty()) {
                    $validator->errors()->add('schedule', __('The schedule contains the same day and time twice.'));
                }
            },
        ];
    }
}
