<?php

namespace Database\Seeders;

use App\Models\Halaqa;
use App\Models\ProgressRecord;
use App\Models\RecitationSubmission;
use App\Models\User;
use App\Services\Quran;
use App\Services\StudentProgress;
use Illuminate\Database\Seeder;

/**
 * Demo data: in every active halaqa the first student has already entered the
 * recitation he will recite next (new memorization and the revision of his last
 * portion), so the teacher sees it waiting for grading. Local environment only.
 */
class RecitationSubmissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(Quran $quran, StudentProgress $progress): void
    {
        Halaqa::query()->active()->with('students')->get()->each(function (Halaqa $halaqa) use ($quran, $progress): void {
            $student = $halaqa->students->first();

            if ($student === null) {
                return;
            }

            RecitationSubmission::query()->firstOrCreate(
                ['student_id' => $student->id, 'halaqa_id' => $halaqa->id],
                ['portions' => $this->portions($student, $quran, $progress), 'notes' => 'جاهز للتسميع بإذن الله'],
            );
        });
    }

    /**
     * Continue memorizing after the last portion and revise that portion.
     *
     * @return array{memorization: array{from_surah: int, from_ayah: int, to_surah: int, to_ayah: int}, revision: array{from_surah: int, from_ayah: int, to_surah: int, to_ayah: int}|null}
     */
    protected function portions(User $student, Quran $quran, StudentProgress $progress): array
    {
        $last = $progress->lastMemorizedPosition($student) ?? ['surah' => 77, 'ayah' => 50];
        [$surah, $ayah] = $last['ayah'] < $quran->ayahCount($last['surah'])
            ? [$last['surah'], $last['ayah'] + 1]
            : [min(114, $last['surah'] + 1), 1];

        $previous = ProgressRecord::query()
            ->where('student_id', $student->id)
            ->latest('recorded_on')
            ->latest('id')
            ->first(['from_surah', 'from_ayah', 'to_surah', 'to_ayah']);

        return [
            'memorization' => [
                'from_surah' => $surah,
                'from_ayah' => $ayah,
                'to_surah' => $surah,
                'to_ayah' => min($quran->ayahCount($surah), $ayah + 4),
            ],
            'revision' => $previous?->only(['from_surah', 'from_ayah', 'to_surah', 'to_ayah']),
        ];
    }
}
