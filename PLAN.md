# منصة «رتّل» لتحفيظ القرآن الكريم — الخطة الكاملة

> **Laravel 13 + React 19 (Inertia.js v3)** في مشروع واحد · واجهة عربية أولاً (RTL) مع دعم الإنجليزية · وضع ليلي · متجاوبة مع الموبايل

---

## 1. الفكرة باختصار

منصة لإدارة حلقات تحفيظ القرآن أونلاين:

- **الأدمن** يضيف المعلمين والطلاب يدوياً (لا يوجد تسجيل عام)، وينشئ الحلقات ويحدد جدولها الأسبوعي ويوزع الطلاب.
- **النظام** ينشئ الجلسات القادمة تلقائياً من جدول كل حلقة، وينشئ رابط الاجتماع لكل جلسة، ويرسل تذكيراً قبل الموعد، ويغلق الجلسات المنتهية ويسجل الغياب.
- **المعلم** يبدأ الجلسة بضغطة، ويسجل الحضور والتسميع (حفظ/مراجعة) بالسورة والآية مع التقدير والأخطاء والملاحظات، ويرفع الفيديوهات، ويتابع طلابه بالتقارير.
- **الطالب** يرى جلسته القادمة مع عدّاد تنازلي ويدخلها بضغطة، ويتابع خريطة حفظه (30 جزءاً)، وملاحظات معلمه، والفيديوهات، وشات الحلقة (نص، صور، ملفات، ورسائل صوتية للتسميع).

---

## 2. القرارات التقنية

| الطبقة | الاختيار | السبب |
|---|---|---|
| Backend | **Laravel 13** (PHP 8.3) | أحدث إصدار، Auth وQueue وScheduler وNotifications جاهزة |
| Frontend | **React 19 + TypeScript** عبر **Inertia.js v3** | لارافيل وريأكت في مشروع واحد بدون API منفصل: الـ Routing والصلاحيات والـ Validation في لارافيل، والواجهة SPA سريعة في ريأكت |
| التصميم | **Tailwind CSS v4** + Headless UI + Lucide Icons | تصميم خاص بهوية إسلامية، ودعم RTL كامل بالخصائص المنطقية (`ms-`/`me-`/`start-`/`end-`) |
| قاعدة البيانات | **MySQL** | متوفرة في Laragon وأي استضافة |
| اللحظي (Realtime) | **Pusher** (الخطة المجانية) أو **Laravel Reverb** (مجاني على سيرفرك) | الشات والإشعارات اللحظية. المنصة تعمل بدونهم أيضاً (تحديث تلقائي كل بضع ثوانٍ) |
| الرسوم البيانية | Recharts | لوحات التحكم والتقارير |
| الخلفية | Queue + Scheduler | إنشاء الجلسات، التذكيرات، الإشعارات، تحميل التسجيلات |

**لماذا React بدل Blade + jQuery؟** الشات اللحظي، والعدّاد التنازلي، وخريطة الأجزاء، والنماذج الديناميكية (سورة/آية) أسهل وأنظف بكثير في React، و Inertia يحافظ على بساطة لارافيل (لا يوجد API أو JWT منفصل).

---

## 3. منصة الاجتماعات — المقارنة والاختيار

الأسعار كما هي في أكتوبر 2026:

| المنصة | الفترة/الخطة المجانية | الاشتراك | الثبات | طريقة الربط |
|---|---|---|---|---|
| **Google Meet** (Google Workspace) | تجربة 14 يوماً لـ Workspace، وحساب Gmail المجاني يعمل باجتماعات جماعية حتى 60 دقيقة | **‏7$ للمستخدم شهرياً** (سنوي) أو 8.40$ (شهري)، و**حساب واحد للأكاديمية يكفي** لإنشاء كل الاجتماعات | ممتاز (بنية جوجل) | تلقائي عبر Google Meet REST API |
| Zoom | الخطة المجانية: 40 دقيقة للاجتماع | ‏14.16$–16.99$ **لكل معلم** شهرياً (المضيف لا يدير اجتماعين في نفس الوقت) | ممتاز | تلقائي عبر Server-to-Server OAuth |
| Jitsi عبر JaaS (8x8) | مجاني حتى 25 مستخدماً نشطاً شهرياً | ‏99$ شهرياً لـ 300 مستخدم | جيد جداً | **داخل المنصة نفسها** (Embedded) بواجهة عربية |
| Jitsi على سيرفرك | مجاني (مفتوح المصدر) | سعر VPS فقط (~10–20$ شهرياً) بلا حدود | حسب السيرفر | داخل المنصة |
| Daily.co | ‏10,000 دقيقة شهرياً | ‏0.004$ لكل مشارك/دقيقة (يغلو مع زيادة الطلاب) | ممتاز | داخل المنصة |

### ✅ الاختيار: **Google Meet عبر Google Workspace**

1. **فترة مجانية:** تجربة Workspace لمدة 14 يوماً، وحتى بدون اشتراك يعمل بحساب Gmail مجاني (الاجتماع الجماعي حتى 60 دقيقة، وهي مدة كافية لأغلب الحلقات).
2. **أرخص اشتراك:** ‏7$ شهرياً لحساب الأكاديمية الواحد، والمنصة تنشئ منه رابطاً مستقلاً لكل جلسة لكل الحلقات (مفتوح للدخول مباشرة بدون انتظار موافقة)، بدل دفع رخصة لكل معلم كما في Zoom.
3. **أعلى ثبات:** بنية جوجل نفسها، ويعمل من المتصفح على الكمبيوتر بدون تثبيت، وتطبيق Meet موجود أصلاً على أغلب هواتف أندرويد.

### المنصة تدعم 4 مزودين وتقدر تغيّر من الإعدادات أو لكل حلقة

| المزود | متى تستخدمه |
|---|---|
| `google_meet` (الموصى به) | الإنتاج: أرخص وأثبت خيار |
| `jitsi` | **التجربة المحلية فوراً بدون أي إعداد** (meet.jit.si)، أو JaaS المجاني حتى 25 مستخدماً داخل المنصة، أو سيرفر Jitsi خاص بلا حدود |
| `zoom` | لو الأكاديمية لديها رخص Zoom بالفعل (كما في الخطة الأصلية) |
| `manual` | لصق أي رابط ثابت (Meet أو Zoom أو غيره) |

> المزوّد الافتراضي بعد التثبيت هو `jitsi` (يعمل بدون إعداد للتجربة). بعد ربط حساب جوجل من **الإعدادات ← الاجتماعات** غيّر الافتراضي إلى Google Meet.

---

## 4. الهوية البصرية والتصميم

- **الألوان:** أخضر زمردي عميق (لون أساسي، يرمز للسكينة) + ذهبي (للتمييز والإنجازات) + خلفية عاجية دافئة. الوضع الليلي أخضر داكن جداً مع لمسات ذهبية.
- **الخطوط:** ‏**IBM Plex Sans Arabic** للواجهة (واضح ومريح للقراءة)، و**Amiri** للآيات والعناوين الزخرفية.
- **الزخرفة:** نقش هندسي إسلامي (نجمة ثمانية) بشفافية خفيفة في صفحة الدخول ولافتة الترحيب والقائمة الجانبية.
- **لمسات خاصة:** التاريخ الهجري بجانب الميلادي، آية ترحيبية، خريطة الأجزاء الثلاثين بتدرج لوني حسب نسبة الحفظ، شارات تقدير (ممتاز/جيد جداً/…).
- **الاتجاه:** RTL افتراضياً، والتبديل للإنجليزية يقلب الواجهة كاملة LTR.
- **الموبايل:** قائمة جانبية منزلقة، جداول تتحول لبطاقات، أزرار كبيرة سهلة اللمس.

---

## 5. الأدوار والصلاحيات

| الإجراء | أدمن | معلم | طالب |
|---|:-:|:-:|:-:|
| إدارة المستخدمين (إضافة/تعديل/إيقاف/كلمة مرور) | ✅ | — | — |
| إنشاء الحلقات وتعديلها وتوزيع الطلاب | ✅ | — | — |
| عرض الحلقات | الكل | حلقاته | حلقاته |
| إنشاء جلسة إضافية / بدء / إنهاء / إلغاء | ✅ | حلقاته | — |
| دخول الجلسة | ✅ | ✅ | ✅ (من 15 دقيقة قبل الموعد) |
| تسجيل الحضور والتسميع | ✅ | طلابه | عرض فقط |
| الفيديوهات | ✅ | لحلقاته | مشاهدة |
| الشات | كل الحلقات | حلقاته | حلقاته |
| التقارير | الكل | حلقاته | تقريره |
| الإعدادات وربط الخدمات | ✅ | — | — |

---

## 6. المراحل

### المرحلة 1 — الأساس (MVP) ✅
- [x] تسجيل الدخول بالبريد **أو** رقم الهاتف، تذكرني، نسيت كلمة المرور، منع الحسابات الموقوفة، حماية من محاولات الدخول المتكررة.
- [x] ثلاثة أدوار (أدمن / معلم / طالب) والأدمن يضيف المستخدمين يدوياً.
- [x] لوحة تحكم.
- [x] الحلقات: الاسم، المعلم، الفئة (رجال/نساء/مختلطة)، المستوى، السعة، **الجدول الأسبوعي** (أيام ومواعيد)، المنطقة الزمنية، مزود الاجتماع.
- [x] توزيع الطلاب على الحلقات وإزالتهم.
- [x] روابط الاجتماعات (يدوي أو تلقائي).
- [x] اللغة (عربي/إنجليزي)، الوضع الليلي، الملف الشخصي (صورة، كلمة مرور، منطقة زمنية، تفضيلات الإشعارات).

### المرحلة 2 — العملية التعليمية ✅
- [x] مكتبة فيديوهات يوتيوب (عامة أو خاصة بحلقة) بمشغل مدمج.
- [x] تسجيل التسميع: **حفظ أو مراجعة**، من (سورة:آية) إلى (سورة:آية) مع التحقق من عدد آيات السورة، التقدير، عدد الأخطاء، الملاحظات.
- [x] حساب المحفوظ تلقائياً: عدد الآيات، النسبة من 6236، **خريطة الأجزاء الثلاثين**، والسور المكتملة.
- [x] الحضور: يُسجل تلقائياً عند ضغط الطالب «دخول» (حاضر/متأخر)، والمعلم يعدّل (حاضر/متأخر/غائب/بعذر).
- [x] الإشعارات داخل المنصة (جرس + صفحة الإشعارات).

### المرحلة 3 — التفاعل ✅
- [x] شات جماعي لكل حلقة: نص، صور، ملفات، **رسائل صوتية** (الطالب يسجل تسميعه والمعلم يسمعه)، من متصل الآن، «يكتب الآن…»، عدد غير المقروء.
- [x] لوحة تحكم مختلفة لكل دور.
- [x] التقارير: الحضور (مصفوفة طلاب × جلسات + النسب)، التقدم (آيات الحفظ والمراجعة ومتوسط التقدير)، تقرير الطالب للطباعة، وتصدير CSV يفتح في Excel بالعربي.

### المرحلة 4 — الأتمتة والتكامل ✅
- [x] إنشاء الجلسات تلقائياً من جدول الحلقة (افتراضياً 14 يوماً قادمة) وإعادة توليدها عند تغيير الجدول.
- [x] إنشاء رابط الاجتماع تلقائياً لكل جلسة (Google Meet / Zoom / Jitsi).
- [x] تذكير قبل الجلسة (افتراضياً 15 دقيقة)، وإشعار عند بدء الجلسة أو إلغائها أو تسجيل تسميع.
- [x] إغلاق الجلسات المنتهية تلقائياً وتسجيل الغائبين.
- [x] التسجيلات: رابط يدوي، أو تلقائياً من Zoom (Webhook)، أو تحميل تسجيل JaaS على مساحة المنصة.
- [x] إشعارات البريد الإلكتروني وواتساب (WhatsApp Cloud API الرسمي من Meta).

### المرحلة 5 — التوسع (SaaS)
- [x] متجاوب بالكامل مع الموبايل.
- [x] تحسينات الأداء: فهارس قاعدة البيانات، تحميل العلاقات مسبقاً، تخزين الإعدادات مؤقتاً، تقسيم كود الصفحات.
- [ ] **Multi-tenant** (كل معلم/أكاديمية لها نظامها) — مؤجلة عمداً، التصور في القسم 12.
- [ ] **الاشتراكات** — مؤجلة عمداً، التصور في القسم 12.

---

## 7. قاعدة البيانات

| الجدول | أهم الأعمدة |
|---|---|
| `users` | name, email, phone, password, role, gender, timezone, locale, avatar_path, guardian_name/phone, bio, zoom_user_id, memorized_ayahs, is_active, notify_email, notify_whatsapp, last_login_at |
| `halaqat` | name, description, teacher_id, gender, level, capacity, schedule (JSON: يوم + وقت), duration_minutes, timezone, meeting_provider, meeting_url, color, is_active |
| `halaqa_student` | halaqa_id, student_id, joined_at |
| `halaqa_sessions` | halaqa_id, teacher_id, title, starts_at, duration_minutes, status (scheduled/live/completed/cancelled), source (schedule/manual), meeting_provider, meeting_id, meeting_url, meeting_password, started_at, ended_at, reminder_sent_at, cancel_reason, notes, recording_url, recording_path |
| `attendances` | halaqa_session_id, student_id, status (present/late/absent/excused), joined_at, notes, recorded_by |
| `progress_records` | student_id, halaqa_id, halaqa_session_id, teacher_id, type (memorization/revision), from_surah, from_ayah, to_surah, to_ayah, ayahs_count, grade, mistakes, notes, recorded_on |
| `videos` | halaqa_id (فارغ = عام), title, description, youtube_id, url, is_published, created_by |
| `messages` | halaqa_id, user_id, type (text/image/audio/file), body, attachment_path/name/mime/size |
| `chat_reads` | halaqa_id, user_id, last_read_message_id |
| `settings` | key, value (JSON) |
| `notifications` | جدول إشعارات لارافيل القياسي |

بيانات القرآن (114 سورة بعدد آياتها + بدايات الأجزاء الثلاثين) في ملف واحد `resources/data/quran.json` يستخدمه الـ Backend والواجهة معاً.

---

## 8. هيكل المشروع

```
app/
  Enums/                 الأدوار، حالات الجلسة والحضور، التقديرات، مزودي الاجتماعات
  Events/                أحداث الشات اللحظية
  Http/Controllers/      كل الشاشات + Webhooks
  Http/Middleware/       اللغة، الحساب النشط، الدور، مشاركة البيانات مع ريأكت
  Http/Requests/         التحقق من المدخلات
  Jobs/                  تحميل التسجيلات
  Models/                User, Halaqa, HalaqaSession, Attendance, ProgressRecord, Video, Message, Setting
  Notifications/         التذكير، بدء/إلغاء الجلسة، التسميع، الانضمام لحلقة… + قناة واتساب
  Policies/              الصلاحيات
  Services/Meetings/     GoogleMeet, Zoom, Jitsi, Manual خلف واجهة واحدة
  Services/              جدولة الجلسات، حساب التقدم القرآني، التقارير، واتساب
resources/js/
  components/ui/         مكتبة مكونات التصميم (أزرار، حقول، نوافذ، جداول…)
  components/            مكونات المنصة (خريطة الأجزاء، اختيار السورة، بطاقة الجلسة…)
  layouts/               تخطيط المنصة وتخطيط الدخول
  pages/                 الصفحات (auth, dashboard, users, halaqat, sessions, progress, videos, chat, reports, settings…)
  lib/                   الترجمة، التواريخ، القرآن، الاتصال اللحظي
lang/ar.json             كل نصوص الواجهة بالعربية (الإنجليزية هي المفاتيح نفسها)
```

---

## 9. التشغيل محلياً (Laragon)

```bash
# 1) المتطلبات: PHP 8.3+، Composer، Node 20+، MySQL (من Laragon)
composer install
npm install

# 2) الإعدادات (ملف .env موجود ومضبوط على Laragon: قاعدة quran، مستخدم root بدون كلمة مرور)
php artisan key:generate        # لو نسخت المشروع لجهاز آخر
php artisan migrate --seed      # الجداول + بيانات تجريبية
php artisan storage:link        # للصور والملفات والرسائل الصوتية

# 3) التشغيل
composer run dev                # السيرفر + Vite + الطابور + المجدول معاً
# أو مع Apache في Laragon: افتح https://quran.test وشغّل npm run dev
```

**حسابات التجربة** (كلمة المرور لكلها: `password`):

| الدور | البريد |
|---|---|
| أدمن | `admin@rattil.test` |
| معلم | `teacher@rattil.test` |
| معلمة | `teacher2@rattil.test` |
| طالب | `student@rattil.test` |

> **مهم:** الكاميرا والميكروفون (للرسائل الصوتية ولـ Jitsi المدمج) تحتاج **HTTPS**. في Laragon: Menu ← Apache ← SSL ← Enabled، ثم افتح `https://quran.test`.

---

## 10. ربط الخدمات الخارجية (كلها اختيارية)

### Google Meet (الموصى به)
1. اشترك في Google Workspace (تجربة 14 يوماً) بدومين الأكاديمية.
2. من [Google Cloud Console](https://console.cloud.google.com/): أنشئ مشروعاً ← فعّل **Google Meet REST API**.
3. OAuth consent screen ← نوع **Internal** (لا يحتاج مراجعة من جوجل).
4. Credentials ← OAuth client ID ← Web application ← Redirect URI: `https://your-domain/settings/google/callback`.
5. ضع القيم في `.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```
6. من المنصة: **الإعدادات ← الاجتماعات ← ربط حساب جوجل**، ثم اجعل Google Meet هو الافتراضي.

### Zoom
Zoom Marketplace ← Develop ← **Server-to-Server OAuth** ← الصلاحيات `meeting:write:admin` و `meeting:read:admin` و `user:read:admin` (و `cloud_recording:read:admin` للتسجيلات):
```
ZOOM_ACCOUNT_ID=...
ZOOM_CLIENT_ID=...
ZOOM_CLIENT_SECRET=...
ZOOM_WEBHOOK_SECRET=...   # اختياري: لاستقبال التسجيلات على /webhooks/zoom (حدث recording.completed)
```
ولكل معلم بريد حسابه في Zoom (حقل «مستخدم Zoom» في ملفه)، وإلا تُنشأ الاجتماعات باسم صاحب الحساب.

### Jitsi
```
JITSI_MODE=public          # public = meet.jit.si (يفتح في نافذة جديدة، بدون إعداد)
                           # jaas   = 8x8 JaaS داخل المنصة (مجاني حتى 25 مستخدماً)
                           # self_hosted = سيرفر Jitsi خاص داخل المنصة
JAAS_APP_ID=vpaas-magic-cookie-...
JAAS_API_KEY_ID=vpaas-magic-cookie-.../xxxxxx
JAAS_PRIVATE_KEY_PATH=storage/app/private/jaas.pem
JAAS_WEBHOOK_SECRET=...    # اختياري: حفظ التسجيلات على /webhooks/jaas
JITSI_DOMAIN=meet.example.com      # للسيرفر الخاص
JITSI_APP_ID= / JITSI_APP_SECRET=  # لو السيرفر الخاص يستخدم JWT
```

### الشات اللحظي (Pusher أو Reverb)
```
BROADCAST_CONNECTION=pusher
PUSHER_APP_ID=... PUSHER_APP_KEY=... PUSHER_APP_SECRET=... PUSHER_APP_CLUSTER=eu
```
الخطة المجانية في Pusher: ‏200 ألف رسالة يومياً و100 اتصال متزامن. عند تجاوزها استخدم **Laravel Reverb** المجاني (`composer require laravel/reverb` ثم `BROADCAST_CONNECTION=reverb` وشغّل `php artisan reverb:start`).
بدون أي منهما: الشات والإشعارات تتحدث تلقائياً كل بضع ثوانٍ.

### البريد الإلكتروني
أي SMTP (مثل Brevo أو Resend المجانيين للبداية):
```
MAIL_MAILER=smtp
MAIL_HOST=... MAIL_PORT=587 MAIL_USERNAME=... MAIL_PASSWORD=...
MAIL_FROM_ADDRESS=no-reply@your-domain
```

### واتساب (WhatsApp Cloud API الرسمي)
```
WHATSAPP_DRIVER=cloud                # log = يكتب الرسائل في ملف اللوج فقط (الافتراضي)
WHATSAPP_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_TEMPLATE_LANGUAGE=ar
```
الرسائل التي تبدأها الأكاديمية (مثل التذكير) تحتاج **قوالب معتمدة من Meta**. أسماء القوالب في `config/services.php` (`session_reminder`, `session_started`, `session_cancelled`, `progress_recorded`)، وكل قالب يحتوي متغيراً واحداً `{{1}}` = نص الرسالة.

### فحص التشكيل في التسميع، والصوت الرجالي لقراءة التفسير والقصص
خدمة صغيرة على السيرفر في مجلد `transcriber/` تقوم بشيئين:
- **فحص التشكيل** (الفتحة والضمة والكسرة) في التسميع: نموذج Whisper مدرَّب على تلاوة القرآن (`tarteel-ai/whisper-base-ar-quran`)، يُحمَّل مرة واحدة (حوالي 400 ميجا) ويستهلك حوالي 1 جيجا رام.
- **صوت رجالي** يقرأ التفسير والقصص على كل الأجهزة: برنامج Piper مفتوح المصدر بصوت «كريم» العربي، يضيف التشكيل بنفسه قبل القراءة. يُحمَّل تلقائياً أول مرة (حوالي 85 ميجا)، وكل جملة تُصنع مرة واحدة وتُحفظ في `storage/app/private/speech`.
```bash
cd transcriber && npm install && npm start      # تسمع على http://127.0.0.1:8787
# أو: composer run dev يشغّلها تلقائياً مع باقي العمليات بعد npm install
```
```
TRANSCRIBER_URL=http://127.0.0.1:8787
TRANSCRIBER_TOKEN=...      # اختياري: نفس القيمة في متغير البيئة TRANSCRIBER_TOKEN للخدمة
```
على السيرفر شغّلها دائماً بـ Supervisor (مثل الطابور). بدون `TRANSCRIBER_URL` يعمل التسميع بالتعرف على الصوت في المتصفح ويفحص الكلمات والحروف فقط.

---

## 11. النشر على سيرفر (نسخة برودكشن)

**السيرفر:** VPS بنظام Ubuntu 24.04، على الأقل 2 معالج و4 جيجا رام (نموذج فحص التشكيل يأخذ حوالي 1 جيجا وصوت القراءة حوالي 200 ميجا)، والأفضل 4 معالج و8 جيجا مع زيادة الطلاب. مثل Hetzner (CPX31) أو DigitalOcean. Laravel Cloud وحده لا يكفي لأن خدمة `transcriber/` (Node) تحتاج سيرفراً، فالأسهل سيرفر واحد لكل شيء. **HTTPS إجباري** (الميكروفون لا يعمل بدونه).

**1) الدومين:** سجل `A` للدومين و `www` يشير لعنوان IP السيرفر.

**2) تجهيز السيرفر (مرة واحدة):**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx mysql-server supervisor git unzip certbot python3-certbot-nginx \
  php8.3-fpm php8.3-cli php8.3-mysql php8.3-mbstring php8.3-xml php8.3-curl php8.3-zip php8.3-gd php8.3-intl php8.3-bcmath php8.3-opcache
curl -sS https://getcomposer.org/installer | sudo php -- --install-dir=/usr/local/bin --filename=composer
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo mysql -e "CREATE DATABASE quran CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER 'quran'@'localhost' IDENTIFIED BY 'كلمة-سر-قوية'; GRANT ALL ON quran.* TO 'quran'@'localhost';"
sudo ufw allow OpenSSH && sudo ufw allow 'Nginx Full' && sudo ufw enable   # المنفذ 8787 يبقى مغلقاً
```

**3) رفع المشروع:** ارفعه أولاً على GitHub (مستودع خاص)، ثم:
```bash
cd /var/www && sudo git clone <رابط المستودع> quran && sudo chown -R $USER:www-data quran && cd quran
composer install --no-dev -o
npm install && npm run build
cp .env.example .env && php artisan key:generate
```
وفي `.env`:
```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://الدومين
DB_DATABASE=quran
DB_USERNAME=quran
DB_PASSWORD=كلمة-سر-قوية
QUEUE_CONNECTION=database
MAIL_MAILER=smtp        # مع بيانات SMTP (القسم 10)
TRANSCRIBER_URL=http://127.0.0.1:8787
TRANSCRIBER_TOKEN=...   # ناتج: php -r "echo bin2hex(random_bytes(32));"
```
```bash
php artisan migrate --force
php artisan db:seed --force    # القرآن والتفسير ومعاني الكلمات والقراء والأذكار + حساب الأدمن
php artisan webpush:keys       # مفاتيح إشعارات الجوال، ضعها في .env
php artisan storage:link
php artisan optimize
sudo chown -R www-data:www-data storage bootstrap/cache transcriber
```
> **مهم:** `db:seed` ينشئ الأدمن `admin@rattil.test` بكلمة المرور `password`: ادخل به فوراً وغيّر البريد وكلمة المرور.

**4) Nginx و HTTPS:** ملف `/etc/nginx/sites-available/quran` ثم `sudo ln -s` إلى `sites-enabled`:
```nginx
server {
    server_name الدومين www.الدومين;
    root /var/www/quran/public;
    index index.php;
    client_max_body_size 20m;   # تسجيلات التسميع والرسائل الصوتية
    location / { try_files $uri $uri/ /index.php?$query_string; }
    location ~ \.php$ { include snippets/fastcgi-php.conf; fastcgi_pass unix:/run/php/php8.3-fpm.sock; }
    location ~ /\.(?!well-known) { deny all; }
}
```
```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d الدومين -d www.الدومين
```

**5) العمليات الدائمة (Supervisor):** أولاً `cd transcriber && sudo -u www-data npm install --omit=dev`، ثم ملف `/etc/supervisor/conf.d/quran.conf`:
```ini
[program:quran-queue]
command=php /var/www/quran/artisan queue:work --tries=3 --max-time=3600
user=www-data
autostart=true
autorestart=true

[program:quran-transcriber]
command=node /var/www/quran/transcriber/server.mjs
directory=/var/www/quran/transcriber
user=www-data
autostart=true
autorestart=true
```
```bash
sudo supervisorctl reread && sudo supervisorctl update
curl http://127.0.0.1:8787/health   # أول تشغيل يحمّل حوالي 500 ميجا (نموذج التشكيل والصوت)، انتظر حتى ready
```

**6) المجدول:** `sudo crontab -u www-data -e` ثم السطر:
`* * * * * php /var/www/quran/artisan schedule:run >> /dev/null 2>&1`

**7) اختياري:** الشات اللحظي (Pusher أو Reverb) والاجتماعات والواتساب من القسم 10.

**8) نسخ احتياطي:** نسخة يومية لقاعدة البيانات (`mysqldump`) ولمجلد `storage/app`.

**تحديث النسخة بعد أي تعديل:**
```bash
cd /var/www/quran && git pull
composer install --no-dev -o && npm install && npm run build
php artisan migrate --force && php artisan optimize
php artisan queue:restart && sudo supervisorctl restart quran-transcriber
```

---

## 12. المرحلة الخامسة (SaaS) — التصور للتنفيذ لاحقاً

- **Multi-tenant بقاعدة بيانات واحدة:** جدول `academies` + عمود `academy_id` في الجداول الأساسية + Global Scope، ونطاق فرعي لكل أكاديمية (`academy.rattil.app`)، وحساب «سوبر أدمن» فوق الأكاديميات.
- **الاشتراكات:** باقات حسب عدد الطلاب/الحلقات، دفع عبر **Paymob** (مناسب لمصر: فيزا، محافظ، فوري) أو Stripe دولياً، فترة تجربة، وإيقاف تلقائي عند انتهاء الاشتراك.
- لماذا مؤجلة؟ لأنها تغيّر كل الاستعلامات والصلاحيات، والأصح تثبيت المنصة لأكاديمية واحدة واختبارها جيداً أولاً (حسب ملاحظة «Do not overbuild early»).

---

## 13. قائمة الاختبار اليدوي (بالترتيب)

**المرحلة 1**
1. ادخل بحساب الأدمن ← أضف معلماً وطالباً (مرة بالبريد ومرة بالهاتف فقط) ← سجّل خروج وادخل بهما.
2. أوقف حساب الطالب ← تأكد أنه لا يستطيع الدخول ← أعد تفعيله.
3. أنشئ حلقة بجدول (مثلاً الأحد والثلاثاء 5 مساءً) ← وزّع عليها طلاباً ← تأكد من ظهور الجلسات القادمة.
4. بدّل اللغة للإنجليزية ثم العربية، وجرّب الوضع الليلي، وعدّل ملفك الشخصي.

**المرحلة 2**
5. كمعلم: افتح جلسة ← سجّل حضوراً ← سجّل تسميع «حفظ» من البقرة 1 إلى البقرة 20 ← افتح صفحة تقدم الطالب وتأكد من خريطة الأجزاء.
6. أضف فيديو يوتيوب لحلقة ← ادخل كطالب وشاهده.
7. تأكد من وصول إشعار التسميع للطالب (الجرس).

**المرحلة 3**
8. افتح شات الحلقة من حسابين (متصفحين) ← أرسل نصاً وصورة ورسالة صوتية.
9. افتح التقارير ← فلتر بالحلقة والتاريخ ← صدّر CSV وافتحه في Excel ← اطبع تقرير طالب.
q
**المرحلة 4**
10. كمعلم: اضغط «بدء الجلسة» ← كطالب: تأكد من وصول إشعار البدء وتفعيل زر الدخول ← ادخل ← تأكد من تسجيل حضورك تلقائياً.
11. ألغِ جلسة بسبب ← تأكد من إشعار الطلاب.
12. شغّل `php artisan sessions:generate` و `php artisan sessions:remind` و `php artisan sessions:close` يدوياً وراقب النتائج.

---

### المصادر (الأسعار)
- [JaaS FAQ — 8x8](https://developer.8x8.com/jaas/docs/faq/) · [Jitsi pricing 2026](https://comparedge.com/tools/jitsi/pricing)
- [Daily pricing](https://www.daily.co/pricing/video-sdk/)
- [Zoom pricing 2026](https://tech.co/web-conferencing/zoom-pricing-guide)
- [Google Workspace pricing 2026](https://www.emailvendorselection.com/google-workspace-pricing/) · [Google Meet time limits](https://meetgeek.ai/blog/google-meet-time-limit)
- [Google Meet REST API — scopes](https://developers.google.com/workspace/meet/api/guides/authenticate-authorize)
