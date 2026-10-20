الخلاصة: خطة النشر كاملة موجودة في ملف PLAN.md قسم ١١، وهذه خطواتها مرتبة مع ما يخص وضعك الحالي وتعديلات اليوم.

أولًا: على جهازك قبل الرفع

احفظ التعديلات في git وارفعها على مستودع خاص على GitHub. عندك الآن ٧٧ ملفًا غير محفوظ، منها ملفات الأحاديث (٤٢ ميجا)، والسيرفر سيسحب الكود من المستودع.
ملفا الإصدارات مستثنيان من git (composer.lock وpackage-lock.json في ملف .gitignore). بدونهما قد يثبّت السيرفر إصدارات مختلفة عن جهازك. أنصح بحذف هذين السطرين من .gitignore وحفظ الملفين، فيثبّت السيرفر نفس الإصدارات بالضبط. أنفذها لو وافقت.
لا ترفع يدويًا ملف .env ولا node_modules ولا vendor ولا public/build ولا public/hot ولا نماذج مجلد transcriber. كلها تُبنى أو تُنزَّل على السيرفر.
ثانيًا: على السيرفر (مرة واحدة)

سيرفر Ubuntu 24.04 بذاكرة ٤ جيجا على الأقل، ودومين يشير إليه، وHTTPS إجباري وإلا لن يعمل الميكروفون ولا الإشعارات ولا تثبيت التطبيق. أوامر تجهيز السيرفر (PHP 8.3، MySQL، Nginx، Node 22، Composer، Supervisor، Certbot) موجودة في الخطة بند ٢.
سحب المشروع وبناؤه:

cd /var/www && sudo git clone <رابط المستودع> quran && cd quran
composer install --no-dev -o
npm install && npm run build
cp .env.example .env && php artisan key:generate
ملف .env على السيرفر. هذا الفرق بينه وبين جهازك:
الإعداد	عندك الآن	على السيرفر
APP_ENV / APP_DEBUG	local / true	production / false
APP_URL	http://quran.test	https://الدومين
DB_*	قاعدتك المحلية	قاعدة السيرفر
QUEUE_CONNECTION	sync	database
MAIL_MAILER	log	smtp مع بيانات بريد حقيقي
VAPID_PUBLIC_KEY / PRIVATE	موجودان	انسخهما من ملفك المحلي كما هما
TRANSCRIBER_URL / TOKEN	مضبوطان	نفس العنوان وكلمة سر جديدة
والباقي يبقى مثل جهازك: APP_LOCALE=ar، APP_USER_TIMEZONE=Africa/Cairo، SESSION_DRIVER=database، CACHE_STORE=database، MEETING_PROVIDER=jitsi مع JITSI_MODE=public، WHATSAPP_DRIVER=log، وBROADCAST_CONNECTION=null (الشات يحدّث نفسه كل دقيقة بدون خدمة لحظية).

قاعدة البيانات والمحتوى:

php artisan migrate --force
php artisan db:seed --force
php artisan storage:link
php artisan optimize
sudo chown -R www-data:www-data storage bootstrap/cache transcriber
أمر التعبئة يثبّت المصحف والتفسير ومعاني الكلمات والقراء والأذكار والقصص وأدلة الصلاة وكتب الحديث. يستغرق نحو خمس دقائق، وفي وضع production لا ينشئ حسابات التجربة، فقط حساب الإدارة admin@rattil.test بكلمة password. ادخل به فورًا وغيّر البريد وكلمة المرور.

Nginx وشهادة HTTPS: إعداد Nginx في الخطة بند ٤ (مع client_max_body_size 20m لتسجيلات التسميع)، ثم certbot --nginx.
العمليات الدائمة بـ Supervisor (الخطة بند ٥): طابور المهام، وخدمة التفريغ والصوت. قبلها:

cd transcriber && sudo -u www-data npm install --omit=dev
أول تشغيل ينزّل نحو ٦٤٠ ميجا (نموذج التلاوة والصوت). تأكد بـ curl http://127.0.0.1:8787/health حتى تظهر ready.

المجدول (التذكيرات، فتح الجلسات والاختبارات، المنبهات، تذكير الصلاة):

* * * * * php /var/www/quran/artisan schedule:run >> /dev/null 2>&1
في sudo crontab -u www-data -e.

اختبار سريع بعد النشر: الدخول بالإدارة، صفحات الأحاديث والقصص والصلاة والمصحف، الميكروفون في التسميع، وإشعار تجريبي من الإعدادات.
نسخة احتياطية يومية لقاعدة البيانات ولمجلد storage/app.
ثالثًا: بعد كل تعديل لاحق


cd /var/www/quran && git pull
composer install --no-dev -o && npm install && npm run build
php artisan migrate --force && php artisan optimize
php artisan queue:restart && sudo supervisorctl restart quran-transcriber
وإن أضفت محتوى جديدًا للـ seeders (أحاديث أو قصص) شغّل أمر التعبئة الخاص به مرة أخرى، فهو آمن للتكرار.
