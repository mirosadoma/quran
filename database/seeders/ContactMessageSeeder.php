<?php

namespace Database\Seeders;

use App\Models\ContactMessage;
use Illuminate\Database\Seeder;

/**
 * Demo data: messages sent from the contact page, waiting in the administration's inbox.
 * Local environment only.
 */
class ContactMessageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (ContactMessage::query()->exists()) {
            return;
        }

        ContactMessage::query()->forceCreate([
            'name' => 'أم عبد الرحمن',
            'phone' => '+201033344455',
            'subject' => 'تسجيل الأطفال',
            'message' => 'السلام عليكم، عندي ولدان في سن السابعة والتاسعة، هل توجد حلقات مناسبة لهما في المساء؟ وكيف أسجلهما؟',
            'created_at' => now()->subHours(5),
        ]);

        ContactMessage::query()->forceCreate([
            'name' => 'مؤسسة الهدى',
            'email' => 'info@alhuda.example',
            'subject' => 'إضافة أكاديمية',
            'message' => 'نرغب في إنشاء أكاديمية لنا على المنصة لإدارة حلقاتنا ومعلمينا. ما الخطوات المطلوبة؟',
            'created_at' => now()->subDay(),
            'read_at' => now()->subHours(20),
        ]);
    }
}
