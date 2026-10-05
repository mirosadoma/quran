<?php

namespace Database\Seeders;

use App\Enums\AnnouncementDelivery;
use App\Enums\AnnouncementKind;
use App\Models\Halaqa;
use App\Models\HalaqaAnnouncement;
use Illuminate\Database\Seeder;

/**
 * Demo data: messages of the teacher in every active halaqa, some already sent
 * (shown to the students in the "messages" tab) and some still waiting for their
 * time or for the next session. Local environment only.
 */
class HalaqaAnnouncementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Halaqa::query()->active()->get()->each(function (Halaqa $halaqa): void {
            $sent = [
                [
                    'kind' => AnnouncementKind::Hadith,
                    'title' => 'فضل تعلّم القرآن',
                    'body' => "قال رسول الله ﷺ: «خَيْرُكُمْ مَنْ تَعَلَّمَ الْقُرْآنَ وَعَلَّمَهُ». (رواه البخاري)\nفاحرصوا بارك الله فيكم على أن تكونوا من أهل هذه الخيرية.",
                    'sent_at' => now()->subDays(6),
                ],
                [
                    'kind' => AnnouncementKind::Advice,
                    'title' => 'نصيحة للحفظ المتقن',
                    'body' => "ابدأ يومك بمراجعة ما حفظته بالأمس قبل الحفظ الجديد، واقرأ الصفحة من المصحف نفسه دائمًا حتى تثبت صورتها في ذهنك.\nوكرّر المقطع الجديد عشر مرات على الأقل قبل أن تسمّعه.",
                    'sent_at' => now()->subDays(3),
                ],
                [
                    'kind' => AnnouncementKind::Word,
                    'title' => null,
                    'body' => 'أحسنتم في جلسة الأمس، ما شاء الله على التزامكم. نسأل الله أن يجعل القرآن ربيع قلوبنا ونور صدورنا.',
                    'sent_at' => now()->subDay(),
                ],
            ];

            foreach ($sent as $message) {
                HalaqaAnnouncement::query()->firstOrCreate(
                    ['halaqa_id' => $halaqa->id, 'body' => $message['body']],
                    [...$message, 'user_id' => $halaqa->teacher_id, 'delivery' => AnnouncementDelivery::Now],
                );
            }

            HalaqaAnnouncement::query()->firstOrCreate(
                ['halaqa_id' => $halaqa->id, 'body' => 'تذكير: موعدنا غدًا بإذن الله مع تسميع الحفظ الجديد، أدخلوا تسميعكم من صفحة الحلقة قبل الجلسة.'],
                [
                    'user_id' => $halaqa->teacher_id,
                    'kind' => AnnouncementKind::Reminder,
                    'delivery' => AnnouncementDelivery::Scheduled,
                    'scheduled_at' => now()->addDay()->setTime(17, 0),
                ],
            );

            $nextSession = $halaqa->sessions()->upcoming()->orderBy('starts_at')->first();

            if ($nextSession !== null) {
                $announcement = HalaqaAnnouncement::query()->firstOrCreate(
                    ['halaqa_id' => $halaqa->id, 'body' => 'مرحبًا بكم في جلسة اليوم، سنبدأ بمراجعة ما حفظناه الأسبوع الماضي ثم الحفظ الجديد.'],
                    [
                        'user_id' => $halaqa->teacher_id,
                        'kind' => AnnouncementKind::Reminder,
                        'delivery' => AnnouncementDelivery::Sessions,
                    ],
                );

                $announcement->sessions()->syncWithoutDetaching([$nextSession->id]);
            }
        });
    }
}
