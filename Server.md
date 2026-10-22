خطوات رفع المنصة على سيرفر البرودكشن. التفاصيل الكاملة لتجهيز السيرفر في ملف PLAN.md قسم ١١، والخطوات هنا مرتبة بالترتيب.

## أولًا: على جهازك قبل الرفع

1. احفظ كل التعديلات في git وارفعها على مستودع خاص (private) على GitHub، لأن السيرفر هيسحب الكود منه.
2. ملفا الإصدارات `composer.lock` و`package-lock.json` بقوا بيترفعوا مع الكود، عشان السيرفر يثبّت نفس الإصدارات اللي على جهازك بالظبط.
3. متْرفعش يدويًا: `.env` ولا `node_modules` ولا `vendor` ولا `public/build` ولا `public/hot` ولا نماذج مجلد `transcriber`. كلها بتتبني أو بتتنزل على السيرفر.
4. ملف Firebase السري `storage/app/private/firebase-credentials.json` مش بيترفع مع git (متجاهَل عمدًا). هترفعه للسيرفر بإيدك (شوف "إشعارات الأجهزة" تحت).

## ثانيًا: على السيرفر (مرة واحدة)

**السيرفر:** Ubuntu 24.04 بذاكرة ٤ جيجا على الأقل، ودومين بيشاور عليه، وHTTPS إجباري، وإلا مش هيشتغل الميكروفون ولا الإشعارات ولا تثبيت التطبيق. أوامر تجهيز السيرفر (PHP 8.3، MySQL، Nginx، Node 22، Composer، Supervisor، Certbot) موجودة في PLAN.md بند ٢، ومعاها الذاكرة الاحتياطية (swap) وتسريع PHP (OPcache).

**سحب المشروع وبناؤه:**

```bash
cd /var/www && sudo git clone < رابط المستودع > quran && cd quran
composer install --no-dev -o
npm ci && npm run build
cp .env.example .env && php artisan key:generate
```

**ملف .env على السيرفر.** الفرق بينه وبين جهازك:

| الإعداد | عندك | على السيرفر |
|---|---|---|
| `APP_ENV` / `APP_DEBUG` | `local` / `true` | `production` / `false` (مهم جدًا قبل التعبئة، شوف التحذير تحت) |
| `APP_URL` | `http://quran.test` | `https://الدومين` |
| `LOG_LEVEL` | `debug` | `error` |
| `DB_*` | قاعدتك المحلية | قاعدة السيرفر |
| `QUEUE_CONNECTION` | `sync` | `database`، ومعاه `DB_QUEUE_RETRY_AFTER=960` |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PHONE` / `ADMIN_PASSWORD` | فاضيين | بيانات حساب الإدارة الأول (اقرأ "قاعدة البيانات والمحتوى") |
| `FIREBASE_API_KEY` / `FIREBASE_APP_ID` / `FIREBASE_MESSAGING_SENDER_ID` / `FIREBASE_VAPID_KEY` | موجودين | انسخهم من ملفك المحلي زي ما هم |
| `BROADCAST_CONNECTION` | `reverb` | `reverb` |
| `REVERB_APP_ID` / `REVERB_APP_KEY` / `REVERB_APP_SECRET` | قيم محلية | ٣ قيم عشوائية جديدة: `php -r "echo bin2hex(random_bytes(16));"` |
| `REVERB_HOST` / `REVERB_PORT` / `REVERB_SCHEME` | `quran.test` / `8080` / `https` | `الدومين` / `443` / `https` |
| `REVERB_SERVER_HOST` / `REVERB_SERVER_PORT` | `0.0.0.0` / `8080` | `127.0.0.1` / `8080` |
| `REVERB_TLS_CERT` / `REVERB_TLS_KEY` | شهادة Laragon | **فاضيين** (Nginx هو اللي بيشفّر) |
| `TRANSCRIBER_URL` / `TRANSCRIBER_TOKEN` | مضبوطين | نفس العنوان `http://127.0.0.1:8787` وكلمة سر جديدة |

الباقي يفضل زي جهازك: `APP_LOCALE=ar`، `APP_USER_TIMEZONE=Africa/Cairo`، `SESSION_DRIVER=database`، `CACHE_STORE=database`، `MEETING_PROVIDER=jitsi` مع `JITSI_MODE=public`، `WHATSAPP_DRIVER=log`. البريد الصادر سيبه `MAIL_MAILER=log` واضبط SMTP من صفحة الإعدادات بعد الدخول.

**إشعارات الأجهزة (Firebase):** ارفع ملف حساب الخدمة من جهازك لنفس المكان على السيرفر، مثلًا من جهازك:

```bash
scp storage/app/private/firebase-credentials.json root@IP-السيرفر:/var/www/quran/storage/app/private/
```

**قاعدة البيانات والمحتوى:**

```bash
php artisan migrate --force
php artisan db:seed --force
php artisan storage:link
php artisan optimize
sudo chown -R www-data:www-data storage bootstrap/cache transcriber
```

- أمر التعبئة (`db:seed`) على السيرفر بيعمل حاجتين بس:
  1. **حساب الإدارة:** من `ADMIN_EMAIL` و`ADMIN_PASSWORD`. لو سبت كلمة السر فاضية، هيعمل كلمة سر عشوائية ويطبعها مرة واحدة في الشاشة، فانسخها. الحساب بيتعمل مرة واحدة بس، ولو شغلت الأمر تاني مش هيلمس الحساب ولا كلمة سره.
  2. **المحتوى:** المصحف والتفسير ومعاني الكلمات والقراء، والأذكار والأدعية، والقصص، ودليل الصلاة، وكتب الحديث، والسنن المهجورة، والأقوال المأثورة. بياخد حوالي خمس دقايق.
- مش هيعمل أكاديميات ولا معلمين ولا طلاب ولا حلقات ولا جلسات ولا أي بيانات تجربة، ومكتبة الفيديو هتبدأ فاضية.
- الإعدادات مش محتاجة تعبئة: القيم الافتراضية شغالة لحد ما تحفظ صفحة الإعدادات.
- بعد أول دخول امسح `ADMIN_PASSWORD` من ملف `.env` وشغل `php artisan optimize`.

> **تحذير:** لازم يكون `APP_ENV=production` قبل `db:seed`. لو كان `local` هيتزرع على السيرفر بيانات التجربة كلها، وحساب `admin@rattil.test` بكلمة سر `password`. ومتشغلش `migrate:fresh` على السيرفر أبدًا، لأنه بيمسح قاعدة البيانات كلها.

**Nginx وشهادة HTTPS:** إعداد Nginx في PLAN.md بند ٤ (مع `client_max_body_size 20m` لتسجيلات التسميع، وتوجيه `/app` و`/apps` للمحادثة اللحظية Reverb)، وبعدها `certbot --nginx`.

**العمليات الدايمة بـ Supervisor** (PLAN.md بند ٥): طابور المهام، والمحادثة اللحظية (Reverb)، وخدمة التفريغ والصوت. اتأكد بعدها إن الثلاثة `RUNNING` بـ `sudo supervisorctl status`. قبلها:

```bash
cd transcriber && sudo -u www-data npm install --omit=dev
```

أول تشغيل بينزّل حوالي ٦٤٠ ميجا (نموذج التلاوة والصوت). اتأكد بـ `curl http://127.0.0.1:8787/health` لحد ما تظهر `ready`.

**المجدول** (التذكيرات، فتح الجلسات والاختبارات، المنبهات، تذكير الصلاة). في `sudo crontab -u www-data -e`:

```
* * * * * php /var/www/quran/artisan schedule:run >> /dev/null 2>&1
```

## ثالثًا: أول دخول بحساب الإدارة

1. **الإعدادات:** اسم المنصة والشعار وبيانات التواصل والمنطقة الزمنية، والبريد الصادر (SMTP) مع إيميل تجريبي، ومفاتيح الرفيق (الأفاتار)، وزرار "إرسال إشعار تجريبي لجهازي". لازم "المحادثة اللحظية" تظهر `reverb`.
2. **الأكاديميات:** اعمل الأكاديميات ومسؤوليها، وهم بيضيفوا المعلمين والطلاب والحلقات.
3. **مكتبة الفيديو:** ضيف الفيديوهات العامة اللي بتظهر في صفحة الفيديوهات في الموقع.
4. **اختبار سريع:** صفحات الأحاديث والقصص والصلاة والمصحف، والميكروفون في التسميع، والشريط السفلي من الموبايل، والمحادثة بحسابين (الرسالة تظهر عند التاني في ثانية)، وتثبيت التطبيق على أندرويد وآيفون وتفعيل الإشعارات من جواه.
5. **نسخة احتياطية يومية** لقاعدة البيانات ولمجلد `storage/app`.

## رابعًا: بعد كل تعديل لاحق

```bash
cd /var/www/quran && git pull
composer install --no-dev -o && npm ci && npm run build
php artisan migrate --force && php artisan optimize
sudo systemctl reload php8.3-fpm
php artisan queue:restart && php artisan reverb:restart && sudo supervisorctl restart quran-transcriber
```

ولو ضفت محتوى جديد (أحاديث أو قصص أو أذكار في `database/data`)، حدّثه بالأمر ده. هو آمن للتكرار ومش بيلمس الحسابات ولا الأكاديميات:

```bash
php artisan db:seed --class=ContentSeeder --force
```

ولو غيرت أي حاجة في `.env` شغل `php artisan optimize` تاني.
