<?php

namespace Database\Seeders;

use App\Models\CommunityPost;
use App\Models\CommunityReply;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demo data: questions of the demo students (and a teacher) in the questions community, most
 * answered by the sheikhs with comments of other students, one accepted answer, and some still
 * waiting for an answer. Local environment only.
 */
class CommunityPostSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        foreach ($this->questions() as $question) {
            $asker = $this->member($question['asker']);

            if ($asker === null || CommunityPost::query()->where('title', $question['title'])->exists()) {
                continue;
            }

            $askedAt = now()->subDays($question['days_ago'])->setTime(mt_rand(8, 21), mt_rand(0, 59));

            $post = new CommunityPost(['user_id' => $asker->id, 'title' => $question['title'], 'body' => $question['body']]);
            $post->forceFill(['created_at' => $askedAt, 'updated_at' => $askedAt])->save();

            foreach ($question['replies'] as $reply) {
                $author = $this->member($reply['author']);

                if ($author === null) {
                    continue;
                }

                $repliedAt = $askedAt->copy()->addHours($reply['hours_later']);

                (new CommunityReply([
                    'community_post_id' => $post->id,
                    'user_id' => $author->id,
                    'body' => $reply['body'],
                    'is_answer' => CommunityReply::isAnswerBy($author),
                ]))->forceFill([
                    'accepted_at' => ($reply['accepted'] ?? false) ? $repliedAt->copy()->addHours(2) : null,
                    'created_at' => $repliedAt,
                    'updated_at' => $repliedAt,
                ])->save();
            }
        }
    }

    /**
     * A demo member (created by the DemoSeeder).
     */
    protected function member(string $email): ?User
    {
        return User::query()->where('email', $email)->first();
    }

    /**
     * @return list<array{asker: string, days_ago: int, title: string, body: string, replies: list<array{author: string, hours_later: int, body: string, accepted?: bool}>}>
     */
    protected function questions(): array
    {
        return [
            [
                'asker' => 'student@rattil.test',
                'days_ago' => 9,
                'title' => 'هل يجوز قراءة القرآن من الهاتف بدون وضوء؟',
                'body' => "السلام عليكم يا شيخ، أراجع وردي أحيانًا من تطبيق المصحف على الهاتف وأنا في المواصلات ولا أكون على وضوء.\nفهل هذا جائز؟ وهل الأفضل أن أتوضأ قبل القراءة؟",
                'replies' => [
                    [
                        'author' => 'teacher@rattil.test',
                        'hours_later' => 3,
                        'accepted' => true,
                        'body' => "وعليكم السلام ورحمة الله.\nالقراءة من الهاتف بغير وضوء جائزة على الصحيح؛ لأن الهاتف لا يأخذ حكم المصحف المكتوب، فلا تُشترط الطهارة لمسّه.\nلكن الأكمل أن تقرأ القرآن على طهارة تعظيمًا لكلام الله، ولا حرج عليك إن شقّ ذلك في المواصلات. أما الجنب فلا يقرأ القرآن حتى يغتسل.",
                    ],
                    [
                        'author' => 'student2@rattil.test',
                        'hours_later' => 20,
                        'body' => 'جزاكم الله خيرًا يا شيخ، كنت أسأل نفس السؤال.',
                    ],
                ],
            ],
            [
                'asker' => 'student2@rattil.test',
                'days_ago' => 7,
                'title' => 'كيف أثبّت حفظي ولا أنسى ما حفظته؟',
                'body' => 'أحفظ الصفحة جيدًا، ثم بعد أسبوع أجد أني نسيت كثيرًا منها. ما الطريقة الصحيحة للمراجعة حتى يثبت الحفظ؟',
                'replies' => [
                    [
                        'author' => 'teacher2@rattil.test',
                        'hours_later' => 5,
                        'body' => "التثبيت يكون بثلاثة أمور:\n١- أن تقرئي الحفظ الجديد في صلاتك.\n٢- أن تراجعي القريب كل يوم (آخر خمس صفحات حفظتِها).\n٣- أن تراجعي البعيد بنظام ثابت، جزءًا كل يوم مثلًا.\nواحرصي على الحفظ من مصحف واحد حتى تثبت صورة الصفحة في ذهنك.",
                    ],
                    [
                        'author' => 'teacher3@rattil.test',
                        'hours_later' => 26,
                        'body' => 'وأضيف: اربطي الآيات بمعانيها، فمن فهم المعنى قلّ نسيانه. واجعلي لكِ زميلة تسمّعين لها وتسمّع لكِ.',
                    ],
                    [
                        'author' => 'aisha@rattil.test',
                        'hours_later' => 30,
                        'body' => 'تجربتي: قراءة الحفظ الجديد في قيام الليل ساعدتني كثيرًا.',
                    ],
                ],
            ],
            [
                'asker' => 'omar@rattil.test',
                'days_ago' => 5,
                'title' => 'ما الفرق بين الإظهار والإخفاء في أحكام النون الساكنة والتنوين؟',
                'body' => 'لم أفهم متى أُظهر النون ومتى أُخفيها، أرجو التوضيح بأمثلة من القرآن.',
                'replies' => [
                    [
                        'author' => 'teacher@rattil.test',
                        'hours_later' => 4,
                        'body' => "الإظهار: إذا جاء بعد النون الساكنة أو التنوين حرف من حروف الحلق (ء هـ ع ح غ خ) نُطقت النون واضحة بلا غنة زائدة، مثل: «مَنْ آمَنَ».\nالإخفاء: إذا جاء بعدها حرف من الحروف الخمسة عشر الباقية نُطقت النون بين الإظهار والإدغام مع الغنة، مثل: «مِنْ قَبْلِ» و«أَنْتُمْ».",
                    ],
                ],
            ],
            [
                'asker' => 'teacher2@rattil.test',
                'days_ago' => 4,
                'title' => 'ما أفضل كتاب لتعليم الأطفال أحكام التجويد؟',
                'body' => 'عندي حلقة للأطفال من سن ثماني سنوات، وأبحث عن كتاب مبسط ومصور لأحكام التجويد.',
                'replies' => [
                    [
                        'author' => 'teacher3@rattil.test',
                        'hours_later' => 6,
                        'body' => 'جرّبي القاعدة النورانية أولًا لتأسيس النطق، ثم كتب التجويد المصورة للأطفال. والأهم التلقي والتكرار في الحلقة أكثر من حفظ القواعد.',
                    ],
                ],
            ],
            [
                'asker' => 'aisha@rattil.test',
                'days_ago' => 2,
                'title' => 'هل يجوز للحائض مراجعة حفظها من القرآن؟',
                'body' => 'أنا في حلقة حفظ، وفي أيام الحيض أخاف أن يضيع مني الحفظ. فهل يجوز لي أن أراجع؟',
                'replies' => [
                    [
                        'author' => 'sara@rattil.test',
                        'hours_later' => 8,
                        'body' => 'أنتظر الإجابة أيضًا، عندي نفس السؤال.',
                    ],
                ],
            ],
            [
                'asker' => 'anas@rattil.test',
                'days_ago' => 1,
                'title' => 'ما أفضل وقت لحفظ القرآن؟',
                'body' => 'هل الأفضل الحفظ بعد الفجر أم قبل النوم؟ وكم صفحة أحفظ في اليوم وأنا مبتدئ؟',
                'replies' => [],
            ],
        ];
    }
}
