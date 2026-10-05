<?php

namespace Database\Seeders;

use App\Enums\AttendanceStatus;
use App\Enums\Gender;
use App\Enums\Grade;
use App\Enums\HalaqaGender;
use App\Enums\HalaqaLevel;
use App\Enums\MeetingProvider;
use App\Enums\MessageType;
use App\Enums\ProgressType;
use App\Enums\SessionSource;
use App\Enums\SessionStatus;
use App\Enums\UserRole;
use App\Models\Academy;
use App\Models\Attendance;
use App\Models\ChatRead;
use App\Models\Halaqa;
use App\Models\HalaqaSession;
use App\Models\Message;
use App\Models\ProgressRecord;
use App\Models\User;
use App\Models\Video;
use App\Notifications\AddedToHalaqa;
use App\Notifications\ProgressRecorded;
use App\Services\Meetings\MeetingManager;
use App\Services\Quran;
use App\Services\SessionScheduler;
use App\Services\StudentProgress;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Realistic demo data: teachers, students, three halaqat with five weeks of
 * history (attendance, recitations, chat) and the upcoming sessions.
 */
class DemoSeeder extends Seeder
{
    /**
     * Next ayah each student will memorize, keyed by "track:student_id".
     *
     * @var array<string, array{surah: int, ayah: int}|null>
     */
    protected array $positions = [];

    /**
     * @var list<string>
     */
    protected array $teacherNotes = [
        'أحسنت، حفظ متقن بارك الله فيك',
        'انتبه لأحكام المد المتصل',
        'راجع مخارج الحروف الحلقية',
        'تحتاج إلى مزيد من التكرار قبل التسميع القادم',
        'قراءة جميلة، استمر على هذا المستوى',
        'انتبه للغنة في النون والميم المشددتين',
        'ركّز على الوقف والابتداء',
    ];

    /**
     * @var list<string>
     */
    protected array $lessonNotes = [
        'تم تسميع الحفظ الجديد ومراجعة الورد السابق، والتركيز على أحكام النون الساكنة.',
        'مراجعة جماعية للسور السابقة وتصحيح الأخطاء الشائعة.',
        'شرح حكم الإخفاء مع أمثلة تطبيقية من السور المحفوظة.',
    ];

    public function __construct(
        protected Quran $quran,
        protected SessionScheduler $scheduler,
        protected MeetingManager $meetings,
        protected StudentProgress $progress,
    ) {}

    /**
     * Run the database seeds (in one transaction: much faster on MySQL).
     */
    public function run(): void
    {
        DB::transaction(fn () => $this->seed());
    }

    /**
     * The academy of the demo teachers, students and halaqat (created by AcademySeeder).
     */
    protected ?Academy $academy = null;

    protected function seed(): void
    {
        mt_srand(1447);

        $this->academy = Academy::query()->firstWhere('slug', 'rattil');

        $teachers = [
            'ahmed' => $this->user('الشيخ أحمد عبد الرحمن', 'teacher@rattil.test', '+201000000001', UserRole::Teacher, Gender::Male, [
                'bio' => 'مجاز برواية حفص عن عاصم، ويُدرّس القرآن الكريم منذ اثني عشر عاماً.',
            ]),
            'fatima' => $this->user('الأستاذة فاطمة الزهراء', 'teacher2@rattil.test', '+201000000002', UserRole::Teacher, Gender::Female, [
                'bio' => 'معلمة قرآن وتجويد، حاصلة على إجازة في متن الجزرية.',
            ]),
            'mahmoud' => $this->user('الشيخ محمود السيد', 'teacher3@rattil.test', '+201000000003', UserRole::Teacher, Gender::Male, [
                'bio' => 'متخصص في تثبيت الحفظ والمراجعة للمتقدمين.',
            ]),
        ];

        $boys = collect([
            ['يوسف أحمد', 'student@rattil.test', '+201100000001', 'أحمد يوسف'],
            ['عمر خالد', 'omar@rattil.test', null, 'خالد عمر'],
            ['حمزة محمود', null, '+201100000003', 'محمود حمزة'],
            ['أنس إبراهيم', 'anas@rattil.test', '+201100000004', null],
            ['زياد مصطفى', null, '+201100000005', 'مصطفى زياد'],
            ['مالك حسن', 'malik@rattil.test', null, null],
            ['بلال عثمان', 'bilal@rattil.test', '+201100000007', null],
            ['معاذ صالح', 'muadh@rattil.test', null, null],
        ])->map(fn (array $row): User => $this->student($row, Gender::Male));

        $girls = collect([
            ['مريم علي', 'student2@rattil.test', '+201200000001', 'علي محمد'],
            ['عائشة محمد', 'aisha@rattil.test', null, null],
            ['خديجة عمر', null, '+201200000003', 'عمر عبد الله'],
            ['سارة يوسف', 'sara@rattil.test', null, null],
            ['رقية حسين', 'ruqayya@rattil.test', '+201200000005', null],
            ['نور الهدى سامي', 'noor@rattil.test', null, null],
            ['هاجر سليمان', null, '+201200000007', 'سليمان أحمد'],
        ])->map(fn (array $row): User => $this->student($row, Gender::Female));

        $this->user('عبد الله ياسر', 'abdullah@rattil.test', null, UserRole::Student, Gender::Male, ['is_active' => false]);

        $fajr = $this->halaqa(
            'حلقة الفجر لحفظ جزء عمّ', $teachers['ahmed'], HalaqaGender::Male, HalaqaLevel::Beginner, 'emerald',
            [[0, '17:00'], [2, '17:00'], [4, '17:00']], 45,
            'حلقة للمبتدئين لحفظ جزء عمّ مع تعلّم أحكام التجويد الأساسية.', $boys->take(6),
        );

        $noor = $this->halaqa(
            'حلقة النور للأخوات', $teachers['fatima'], HalaqaGender::Female, HalaqaLevel::Intermediate, 'rose',
            [[6, '18:00'], [1, '18:00'], [3, '18:00']], 60,
            'حفظ جزء تبارك مع المراجعة اليومية لجزء عمّ.', $girls,
        );

        $itqan = $this->halaqa(
            'حلقة الإتقان والمراجعة', $teachers['mahmoud'], HalaqaGender::Male, HalaqaLevel::Advanced, 'indigo',
            [[1, '20:00'], [4, '20:00']], 60,
            'حفظ سورة البقرة مع تثبيت الجزأين التاسع والعشرين والثلاثين.', $boys->slice(4)->values(),
        );

        $this->seedHistory($fajr, 'juz_amma');
        $this->seedHistory($noor, 'tabarak');
        $this->seedHistory($itqan, 'baqarah');

        $this->seedVideos($fajr, $noor, $itqan);
        $this->seedChat($fajr, [
            ['t', 'السلام عليكم ورحمة الله، أهلاً بكم في حلقة الفجر. ورد هذا الأسبوع: سورة الفيل وقريش.'],
            ['s', 'وعليكم السلام ورحمة الله، جزاكم الله خيراً يا شيخ'],
            ['s', 'هل نراجع سورة الهمزة في الجلسة القادمة؟'],
            ['t', 'نعم، ومن يحفظ مبكراً يرسل تسميعه صوتياً هنا لأستمع إليه.'],
            ['s', 'إن شاء الله يا شيخ'],
        ]);
        $this->seedChat($noor, [
            ['t', 'السلام عليكن، بارك الله في همتكن هذا الأسبوع 🌸'],
            ['s', 'وعليكم السلام أستاذة، متى موعد اختبار سورة الملك؟'],
            ['t', 'يوم الأربعاء بإذن الله بعد المراجعة.'],
            ['s', 'جزاكِ الله خيراً'],
        ]);
        $this->seedChat($itqan, [
            ['t', 'تذكير: نراجع الربع الأول من البقرة كاملاً قبل الانتقال للحفظ الجديد.'],
            ['s', 'إن شاء الله يا شيخ، نحتاج مراجعة متشابهات الآيات.'],
            ['t', 'سنخصص لها جزءاً من الجلسة القادمة.'],
        ]);

        foreach ([$fajr, $noor, $itqan] as $halaqa) {
            $this->scheduler->generate($halaqa);
        }

        $this->seedDemoSession($fajr);

        User::query()->students()->each(fn (User $student) => $this->progress->refresh($student));

        $mainStudent = $boys->first();
        $mainStudent->notify(new AddedToHalaqa($fajr->load('teacher')));

        $latestRecord = ProgressRecord::query()->where('student_id', $mainStudent->id)->latest('recorded_on')->latest('id')->first();

        if ($latestRecord !== null) {
            $mainStudent->notify(new ProgressRecorded($latestRecord));
        }
    }

    /**
     * @param  array<string, mixed>  $extra
     */
    protected function user(string $name, ?string $email, ?string $phone, UserRole $role, Gender $gender, array $extra = []): User
    {
        return User::query()->updateOrCreate(
            $email ? ['email' => $email] : ['phone' => $phone],
            [
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'password' => 'password',
                'role' => $role,
                'academy_id' => $role === UserRole::Admin ? null : $this->academy?->id,
                'gender' => $gender,
                'timezone' => config('app.user_timezone'),
                'locale' => 'ar',
                'country' => 'مصر',
                'is_active' => true,
                'last_login_at' => now()->subHours(mt_rand(1, 96)),
                ...$extra,
            ],
        );
    }

    /**
     * @param  array{0: string, 1: string|null, 2: string|null, 3: string|null}  $row
     */
    protected function student(array $row, Gender $gender): User
    {
        return $this->user($row[0], $row[1], $row[2], UserRole::Student, $gender, [
            'guardian_name' => $row[3],
            'guardian_phone' => $row[3] ? '+20101'.mt_rand(1000000, 9999999) : null,
            'birth_date' => CarbonImmutable::create(mt_rand(2010, 2017), mt_rand(1, 12), mt_rand(1, 28))->toDateString(),
        ]);
    }

    /**
     * @param  list<array{0: int, 1: string}>  $slots
     * @param  Collection<int, User>  $students
     */
    protected function halaqa(
        string $name,
        User $teacher,
        HalaqaGender $gender,
        HalaqaLevel $level,
        string $color,
        array $slots,
        int $duration,
        string $description,
        Collection $students,
    ): Halaqa {
        $halaqa = Halaqa::query()->create([
            'academy_id' => $this->academy?->id,
            'name' => $name,
            'description' => $description,
            'teacher_id' => $teacher->id,
            'gender' => $gender,
            'level' => $level,
            'capacity' => 12,
            'schedule' => array_map(fn (array $slot): array => ['day' => $slot[0], 'time' => $slot[1]], $slots),
            'duration_minutes' => $duration,
            'timezone' => config('app.user_timezone'),
            'meeting_provider' => MeetingProvider::tryFrom((string) config('meetings.default')) ?? MeetingProvider::Jitsi,
            'color' => $color,
            'is_active' => true,
        ]);

        $joinedAt = now()->subDays(60);

        $halaqa->students()->attach(
            $students->pluck('id')->mapWithKeys(fn (int $id): array => [$id => ['created_at' => $joinedAt, 'updated_at' => $joinedAt]])->all(),
        );

        return $halaqa->load(['students', 'teacher']);
    }

    /**
     * Five weeks of completed sessions with attendance and recitations.
     */
    protected function seedHistory(Halaqa $halaqa, string $track): void
    {
        foreach ($halaqa->students as $student) {
            $this->seedPriorMemorization($halaqa, $student, $track);
        }

        $timezone = $halaqa->timezone;
        $from = CarbonImmutable::now($timezone)->subDays(35)->startOfDay();
        $until = CarbonImmutable::now($timezone)->subDay()->endOfDay();
        $count = 0;

        for ($date = $from; $date->lessThanOrEqualTo($until); $date = $date->addDay()) {
            foreach ($halaqa->scheduleSlots() as $slot) {
                if ($slot['day'] !== $date->dayOfWeek) {
                    continue;
                }

                $count++;
                [$hour, $minute] = array_map('intval', explode(':', $slot['time']));
                $startsAt = $date->setTime($hour, $minute)->utc();
                $cancelled = $count === 4;

                $session = $halaqa->sessions()->create([
                    'teacher_id' => $halaqa->teacher_id,
                    'starts_at' => $startsAt,
                    'duration_minutes' => $halaqa->duration_minutes,
                    'status' => $cancelled ? SessionStatus::Cancelled : SessionStatus::Completed,
                    'source' => SessionSource::Schedule,
                    'slot_key' => $date->format('Y-m-d').' '.$slot['time'],
                    'meeting_provider' => $halaqa->meeting_provider,
                    'started_at' => $cancelled ? null : $startsAt->addMinutes(mt_rand(0, 3)),
                    'ended_at' => $cancelled ? null : $startsAt->addMinutes($halaqa->duration_minutes),
                    'cancel_reason' => $cancelled ? 'ظرف طارئ للمعلم، وسيتم تعويض الجلسة' : null,
                    'notes' => ! $cancelled && mt_rand(1, 3) === 1 ? $this->lessonNotes[array_rand($this->lessonNotes)] : null,
                    'reminder_sent_at' => $startsAt->subMinutes(15),
                ]);

                $session->setRelation('halaqa', $halaqa);
                $this->meetings->tryEnsure($session);

                if ($cancelled) {
                    continue;
                }

                foreach ($halaqa->students as $student) {
                    $this->seedAttendanceAndRecords($halaqa, $session, $student, $track, $startsAt);
                }
            }
        }
    }

    protected function seedAttendanceAndRecords(Halaqa $halaqa, HalaqaSession $session, User $student, string $track, CarbonImmutable $startsAt): void
    {
        $roll = mt_rand(1, 100);
        $status = match (true) {
            $roll <= 76 => AttendanceStatus::Present,
            $roll <= 86 => AttendanceStatus::Late,
            $roll <= 95 => AttendanceStatus::Absent,
            default => AttendanceStatus::Excused,
        };

        Attendance::query()->create([
            'halaqa_session_id' => $session->id,
            'student_id' => $student->id,
            'status' => $status,
            'joined_at' => match ($status) {
                AttendanceStatus::Present => $startsAt->addMinutes(mt_rand(-5, 4)),
                AttendanceStatus::Late => $startsAt->addMinutes(mt_rand(11, 20)),
                default => null,
            },
            'recorded_by' => $halaqa->teacher_id,
        ]);

        if (! $status->attended()) {
            return;
        }

        $recordedOn = $startsAt->setTimezone($halaqa->timezone)->toDateString();

        if (mt_rand(1, 100) <= 78) {
            $portion = $this->nextPortion($track, $student->id);

            if ($portion !== null) {
                $this->record($halaqa, $session, $student, ProgressType::Memorization, $portion, $recordedOn);
            }
        }

        if (mt_rand(1, 100) <= 40) {
            $this->record($halaqa, $session, $student, ProgressType::Revision, $this->revisionPortion($track), $recordedOn);
        }
    }

    /**
     * Portions memorized before joining the platform.
     */
    protected function seedPriorMemorization(Halaqa $halaqa, User $student, string $track): void
    {
        $key = "{$track}:{$student->id}";

        [$portions, $this->positions[$key]] = match ($track) {
            'juz_amma' => (function (): array {
                $start = mt_rand(103, 110);

                return [[[$start + 1, 1, 114, 6]], ['surah' => $start, 'ayah' => 1]];
            })(),
            'tabarak' => [[[78, 1, 114, 6]], ['surah' => 67, 'ayah' => mt_rand(1, 12)]],
            default => [[[1, 1, 1, 7], [67, 1, 114, 6]], ['surah' => 2, 'ayah' => mt_rand(1, 60)]],
        };

        foreach ($portions as [$fromSurah, $fromAyah, $toSurah, $toAyah]) {
            ProgressRecord::query()->create([
                'student_id' => $student->id,
                'halaqa_id' => $halaqa->id,
                'teacher_id' => $halaqa->teacher_id,
                'type' => ProgressType::Memorization,
                'from_surah' => $fromSurah,
                'from_ayah' => $fromAyah,
                'to_surah' => $toSurah,
                'to_ayah' => $toAyah,
                'ayahs_count' => $this->quran->countRange($fromSurah, $fromAyah, $toSurah, $toAyah),
                'grade' => Grade::VeryGood,
                'mistakes' => 0,
                'notes' => 'محفوظ سابق تم اختباره عند الانضمام للحلقة',
                'recorded_on' => now()->subDays(120)->toDateString(),
            ]);
        }
    }

    /**
     * The next portion of new memorization for the student.
     *
     * @return array{0: int, 1: int, 2: int, 3: int}|null
     */
    protected function nextPortion(string $track, int $studentId): ?array
    {
        $key = "{$track}:{$studentId}";
        $position = $this->positions[$key] ?? null;

        if ($position === null) {
            return null;
        }

        $surah = $position['surah'];
        $from = $position['ayah'];
        $count = $this->quran->ayahCount($surah);
        $size = match ($track) {
            'juz_amma' => mt_rand(3, 7),
            'tabarak' => mt_rand(4, 8),
            default => mt_rand(2, 5),
        };
        $to = min($count, $from + $size - 1);

        $this->positions[$key] = match (true) {
            $to < $count => ['surah' => $surah, 'ayah' => $to + 1],
            $track === 'juz_amma' => $surah - 1 >= 78 ? ['surah' => $surah - 1, 'ayah' => 1] : null,
            $track === 'tabarak' => $surah + 1 <= 77 ? ['surah' => $surah + 1, 'ayah' => 1] : null,
            default => ['surah' => $surah + 1, 'ayah' => 1],
        };

        return [$surah, $from, $surah, $to];
    }

    /**
     * A whole surah from the part the student already knows well.
     *
     * @return array{0: int, 1: int, 2: int, 3: int}
     */
    protected function revisionPortion(string $track): array
    {
        $surah = match ($track) {
            'juz_amma' => mt_rand(110, 114),
            'tabarak' => mt_rand(78, 114),
            default => mt_rand(67, 77),
        };

        return [$surah, 1, $surah, $this->quran->ayahCount($surah)];
    }

    /**
     * @param  array{0: int, 1: int, 2: int, 3: int}  $portion
     */
    protected function record(Halaqa $halaqa, HalaqaSession $session, User $student, ProgressType $type, array $portion, string $recordedOn): void
    {
        $roll = mt_rand(1, 100);
        $grade = match (true) {
            $roll <= 34 => Grade::Excellent,
            $roll <= 64 => Grade::VeryGood,
            $roll <= 84 => Grade::Good,
            $roll <= 95 => Grade::Acceptable,
            default => Grade::Weak,
        };

        [$fromSurah, $fromAyah, $toSurah, $toAyah] = $portion;

        ProgressRecord::query()->create([
            'student_id' => $student->id,
            'halaqa_id' => $halaqa->id,
            'halaqa_session_id' => $session->id,
            'teacher_id' => $halaqa->teacher_id,
            'type' => $type,
            'from_surah' => $fromSurah,
            'from_ayah' => $fromAyah,
            'to_surah' => $toSurah,
            'to_ayah' => $toAyah,
            'ayahs_count' => $this->quran->countRange($fromSurah, $fromAyah, $toSurah, $toAyah),
            'grade' => $grade,
            'mistakes' => max(0, 5 - $grade->score() + mt_rand(-1, 1)),
            'notes' => mt_rand(1, 100) <= 45 ? $this->teacherNotes[array_rand($this->teacherNotes)] : null,
            'recorded_on' => $recordedOn,
        ]);
    }

    protected function seedVideos(Halaqa $fajr, Halaqa $noor, Halaqa $itqan): void
    {
        $videos = [
            [null, 'سورة الملك بصوت الشيخ مشاري العفاسي', 'TkSfCS_HMjs', 'استمع للسورة يومياً قبل النوم لتثبيت الحفظ.'],
            [null, 'سورة يس كاملة', 'kFn64z09MWA', null],
            [$fajr, 'تعليم التجويد للمبتدئين: أحكام النون الساكنة والتنوين', '0XsLkGnUIwM', 'الدرس الأول من دورة التجويد، شاهده قبل جلسة الأحد.'],
            [$fajr, 'دورة التجويد المبسط: القلقلة', 'kZetNz-gA0U', null],
            [$noor, 'سلسلة تعليم أحكام التجويد — الدرس الأول', 'ub2_sYLnQRg', 'مقدمة في علم التجويد وفضله.'],
            [$noor, 'دورة التجويد المبسط: الإظهار الحلقي', 'royUKKQMTeg', null],
            [$itqan, 'سورة الملك — تلاوة للمراجعة', '5Y9G0yYpfxU', 'راجع السورة كاملة مع التلاوة قبل الاختبار.'],
        ];

        foreach ($videos as $index => [$halaqa, $title, $youtubeId, $description]) {
            // Videos without halaqa go to the platform's library, shown to everyone and on the website.
            $video = new Video([
                'academy_id' => $halaqa?->academy_id,
                'halaqa_id' => $halaqa?->id,
                'title' => $title,
                'description' => $description,
                'url' => "https://www.youtube.com/watch?v={$youtubeId}",
                'youtube_id' => $youtubeId,
                'is_published' => true,
                'created_by' => $halaqa?->teacher_id ?? User::query()->admins()->value('id'),
            ]);
            $video->created_at = now()->subDays(20 - $index * 2);
            $video->save();
        }
    }

    /**
     * @param  list<array{0: 't'|'s', 1: string}>  $texts  Author ("t" teacher, "s" student) and text.
     */
    protected function seedChat(Halaqa $halaqa, array $texts): void
    {
        $students = $halaqa->students->take(3)->values();
        $sentAt = now()->subDays(3)->setTime(19, 0);
        $lastId = 0;

        foreach ($texts as $index => [$role, $text]) {
            $author = $role === 't' ? $halaqa->teacher : $students[$index % $students->count()];

            $message = new Message([
                'halaqa_id' => $halaqa->id,
                'user_id' => $author->id,
                'type' => MessageType::Text,
                'body' => $text,
            ]);
            $message->created_at = $sentAt->addMinutes($index * 17);
            $message->updated_at = $message->created_at;
            $message->save();

            $lastId = $message->id;
        }

        foreach ($halaqa->students->skip(1) as $student) {
            ChatRead::query()->updateOrCreate(
                ['halaqa_id' => $halaqa->id, 'user_id' => $student->id],
                ['last_read_message_id' => $lastId],
            );
        }
    }

    /**
     * A session starting in a few minutes so joining can be tried right away.
     */
    protected function seedDemoSession(Halaqa $halaqa): void
    {
        $session = $halaqa->sessions()->create([
            'teacher_id' => $halaqa->teacher_id,
            'title' => 'جلسة تجريبية — جرّب الدخول الآن',
            'starts_at' => now()->addMinutes(10)->startOfMinute(),
            'duration_minutes' => 45,
            'status' => SessionStatus::Scheduled,
            'source' => SessionSource::Manual,
            'meeting_provider' => $halaqa->meeting_provider,
            'created_by' => $halaqa->teacher_id,
        ]);

        $session->setRelation('halaqa', $halaqa);
        $this->meetings->tryEnsure($session);
    }
}
