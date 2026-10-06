<?php

use App\Http\Controllers\AcademyController;
use App\Http\Controllers\AdhkarController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\CommunityPostController;
use App\Http\Controllers\CommunityReplyController;
use App\Http\Controllers\ContactMessageController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeedController;
use App\Http\Controllers\DeedReportController;
use App\Http\Controllers\DhikrCategoryController;
use App\Http\Controllers\DhikrController;
use App\Http\Controllers\GoogleConnectionController;
use App\Http\Controllers\HalaqaAnnouncementController;
use App\Http\Controllers\HalaqaController;
use App\Http\Controllers\HalaqaStudentController;
use App\Http\Controllers\ImpersonationController;
use App\Http\Controllers\InstallController;
use App\Http\Controllers\JoinRequestController;
use App\Http\Controllers\KidsController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\ManifestController;
use App\Http\Controllers\MushafBookmarkController;
use App\Http\Controllers\MushafController;
use App\Http\Controllers\MushafHighlightController;
use App\Http\Controllers\MyAcademyController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PrayerController;
use App\Http\Controllers\PrayerReminderController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProgressController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\RecitationSubmissionController;
use App\Http\Controllers\RecitationTranscriptionController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\SessionMeetingController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SiteController;
use App\Http\Controllers\SpeechController;
use App\Http\Controllers\StoryController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VideoController;
use App\Http\Controllers\Webhooks\JaasWebhookController;
use App\Http\Controllers\Webhooks\ZoomWebhookController;
use Illuminate\Support\Facades\Route;

/*
 * The public website: what the platform offers, its academies and videos, and how to reach us.
 */
Route::get('/', [SiteController::class, 'home'])->name('home');

Route::controller(SiteController::class)->name('site.')->group(function () {
    Route::get('about', 'about')->name('about');
    Route::get('contact', 'contact')->name('contact');
    Route::get('videos', 'videos')->name('videos');
    Route::get('academies', 'academies')->name('academies');
    Route::get('academies/{academy:slug}', 'academy')->name('academy');
    Route::get('terms', 'terms')->name('terms');
    Route::get('faq', 'faq')->name('faq');
    Route::get('guide', 'guide')->name('guide');
});

Route::post('contact', [ContactMessageController::class, 'store'])->middleware('throttle:5,1')->name('site.contact.store');

Route::post('locale', LocaleController::class)->name('locale');

// Fetched by browsers without cookies, so it skips the session middleware.
Route::get('manifest.webmanifest', ManifestController::class)->withoutMiddleware('web')->name('manifest');

// The link shared to install the app on a phone or a computer.
Route::get('install', InstallController::class)->name('install');

Route::post('webhooks/zoom', ZoomWebhookController::class)->name('webhooks.zoom');
Route::post('webhooks/jaas', JaasWebhookController::class)->name('webhooks.jaas');

Route::middleware('guest')->group(function () {
    Route::get('login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('login', [AuthenticatedSessionController::class, 'store'])->middleware('throttle:10,1')->name('login.store');
    Route::get('register', [RegisteredUserController::class, 'create'])->name('register');
    Route::post('register', [RegisteredUserController::class, 'store'])->middleware('throttle:10,1')->name('register.store');
    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])->name('password.request');
    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])->middleware('throttle:5,1')->name('password.email');
    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])->name('password.reset');
    Route::post('reset-password', [NewPasswordController::class, 'store'])->name('password.store');
});

// Registered with Google as the OAuth redirect address, so it keeps its path.
Route::get('settings/google/callback', [GoogleConnectionController::class, 'callback'])
    ->middleware(['auth', 'active', 'role:admin'])
    ->name('settings.google.callback');

/*
 * The dashboard (under /admin, apart from the public website).
 */
Route::middleware(['auth', 'active'])->prefix('admin')->group(function () {
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::post('impersonation/stop', [ImpersonationController::class, 'stop'])->name('impersonation.stop');

    Route::get('profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::put('profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('profile/password', [ProfileController::class, 'password'])->name('profile.password');

    // The administration and the managers of academies (each manager in their own academy).
    Route::middleware('role:admin,manager')->group(function () {
        Route::resource('users', UserController::class);
        Route::patch('users/{user}/toggle-active', [UserController::class, 'toggleActive'])->name('users.toggle-active');

        Route::post('halaqat/{halaqa}/students', [HalaqaStudentController::class, 'store'])->name('halaqat.students.store');
        Route::delete('halaqat/{halaqa}/students/{student}', [HalaqaStudentController::class, 'destroy'])->name('halaqat.students.destroy');

        Route::get('academies', [AcademyController::class, 'index'])->name('academies.index');
        Route::get('academies/create', [AcademyController::class, 'create'])->name('academies.create');
        Route::post('academies', [AcademyController::class, 'store'])->name('academies.store');
        Route::get('academies/{academy}', [AcademyController::class, 'show'])->withTrashed()->name('academies.show');
        Route::get('academies/{academy}/edit', [AcademyController::class, 'edit'])->name('academies.edit');
        Route::put('academies/{academy}', [AcademyController::class, 'update'])->name('academies.update');
        Route::patch('academies/{academy}/toggle', [AcademyController::class, 'toggle'])->name('academies.toggle');
        Route::delete('academies/{academy}', [AcademyController::class, 'destroy'])->name('academies.destroy');
        Route::patch('academies/{academy}/restore', [AcademyController::class, 'restore'])->withTrashed()->name('academies.restore');
        Route::delete('academies/{academy}/force', [AcademyController::class, 'forceDestroy'])->withTrashed()->name('academies.force-destroy');
        Route::post('academies/{academy}/impersonate', [ImpersonationController::class, 'start'])->name('academies.impersonate');

        Route::get('join-requests', [JoinRequestController::class, 'index'])->name('join-requests.index');
        Route::patch('join-requests/{joinRequest}/accept', [JoinRequestController::class, 'accept'])->name('join-requests.accept');
        Route::patch('join-requests/{joinRequest}/reject', [JoinRequestController::class, 'reject'])->name('join-requests.reject');
    });

    // The platform's administration only.
    Route::middleware('role:admin')->group(function () {
        Route::get('settings', [SettingsController::class, 'edit'])->name('settings.edit');
        Route::put('settings', [SettingsController::class, 'update'])->name('settings.update');
        Route::get('settings/google/connect', [GoogleConnectionController::class, 'redirect'])->name('settings.google.connect');
        Route::delete('settings/google', [GoogleConnectionController::class, 'destroy'])->name('settings.google.disconnect');

        Route::get('contact-messages', [ContactMessageController::class, 'index'])->name('contact-messages.index');
        Route::patch('contact-messages/{message}/read', [ContactMessageController::class, 'read'])->name('contact-messages.read');
        Route::delete('contact-messages/{message}', [ContactMessageController::class, 'destroy'])->name('contact-messages.destroy');

        Route::post('adhkar/categories', [DhikrCategoryController::class, 'store'])->name('adhkar.categories.store');
        Route::put('adhkar/categories/{category}', [DhikrCategoryController::class, 'update'])->name('adhkar.categories.update');
        Route::patch('adhkar/categories/{category}/toggle', [DhikrCategoryController::class, 'toggle'])->name('adhkar.categories.toggle');
        Route::delete('adhkar/categories/{category}', [DhikrCategoryController::class, 'destroy'])->name('adhkar.categories.destroy');
        Route::post('adhkar', [DhikrController::class, 'store'])->name('adhkar.store');
        Route::put('adhkar/{dhikr}', [DhikrController::class, 'update'])->name('adhkar.update');
        Route::patch('adhkar/{dhikr}/toggle', [DhikrController::class, 'toggle'])->name('adhkar.toggle');
        Route::delete('adhkar/{dhikr}', [DhikrController::class, 'destroy'])->name('adhkar.destroy');
    });

    // Students: their academy, or the academies they can ask to join.
    Route::get('my-academy', [MyAcademyController::class, 'show'])->name('my-academy');
    Route::post('my-academy/leave', [MyAcademyController::class, 'leave'])->name('my-academy.leave');
    Route::post('academies/{academy}/join', [MyAcademyController::class, 'join'])->middleware('throttle:10,1')->name('academies.join');
    Route::patch('join-requests/{joinRequest}/cancel', [MyAcademyController::class, 'cancel'])->name('join-requests.cancel');

    Route::get('mushaf', [MushafController::class, 'index'])->name('mushaf.index');
    Route::get('mushaf/pages/{page}', [MushafController::class, 'page'])->whereNumber('page')->name('mushaf.page');
    Route::get('mushaf/search', [MushafController::class, 'search'])->middleware('throttle:60,1')->name('mushaf.search');
    Route::get('mushaf/ayahs/{ayah}/tafsir', [MushafController::class, 'tafsir'])->whereNumber('ayah')->name('mushaf.tafsir');
    Route::put('mushaf/ayahs/{ayah}/meanings', [MushafController::class, 'updateMeanings'])->whereNumber('ayah')->middleware('role:admin')->name('mushaf.meanings.update');
    Route::get('mushaf/surahs/{surah}', [MushafController::class, 'surah'])->whereNumber('surah')->name('mushaf.surah');
    Route::put('mushaf/position', [MushafController::class, 'position'])->name('mushaf.position');
    Route::post('mushaf/bookmarks', [MushafBookmarkController::class, 'store'])->name('mushaf.bookmarks.store');
    Route::delete('mushaf/bookmarks/{bookmark}', [MushafBookmarkController::class, 'destroy'])->name('mushaf.bookmarks.destroy');
    Route::put('mushaf/highlights/{ayah}', [MushafHighlightController::class, 'update'])->whereNumber('ayah')->name('mushaf.highlights.update');
    Route::delete('mushaf/highlights/{ayah}', [MushafHighlightController::class, 'destroy'])->whereNumber('ayah')->name('mushaf.highlights.destroy');

    Route::get('adhkar', [AdhkarController::class, 'index'])->name('adhkar.index');

    Route::resource('halaqat', HalaqaController::class)->parameters(['halaqat' => 'halaqa']);
    Route::post('halaqat/{halaqa}/generate-sessions', [HalaqaController::class, 'generateSessions'])->name('halaqat.generate-sessions');
    Route::put('halaqat/{halaqa}/recitation', [RecitationSubmissionController::class, 'update'])->middleware('role:student')->name('halaqat.recitation.update');
    Route::delete('recitation-submissions/{submission}', [RecitationSubmissionController::class, 'destroy'])->name('recitation-submissions.destroy');

    Route::middleware('role:admin,manager,teacher')->group(function () {
        Route::post('halaqat/{halaqa}/announcements', [HalaqaAnnouncementController::class, 'store'])->name('halaqat.announcements.store');
        Route::put('announcements/{announcement}', [HalaqaAnnouncementController::class, 'update'])->name('announcements.update');
        Route::delete('announcements/{announcement}', [HalaqaAnnouncementController::class, 'destroy'])->name('announcements.destroy');
    });

    Route::resource('sessions', SessionController::class);
    Route::post('sessions/{session}/cancel', [SessionController::class, 'cancel'])->name('sessions.cancel');
    Route::put('sessions/{session}/notes', [SessionController::class, 'notes'])->name('sessions.notes');
    Route::put('sessions/{session}/attendance', [AttendanceController::class, 'update'])->name('sessions.attendance');
    Route::post('sessions/{session}/join', [SessionMeetingController::class, 'join'])->name('sessions.join');
    Route::get('sessions/{session}/room', [SessionMeetingController::class, 'room'])->name('sessions.room');
    Route::post('sessions/{session}/end', [SessionMeetingController::class, 'end'])->name('sessions.end');

    Route::get('progress', [ProgressController::class, 'index'])->name('progress.index');
    Route::get('progress/students/{student}', [ProgressController::class, 'student'])->name('progress.student');
    Route::post('progress', [ProgressController::class, 'store'])->middleware('role:admin,manager,teacher')->name('progress.store');
    Route::put('progress/{record}', [ProgressController::class, 'update'])->name('progress.update');
    Route::delete('progress/{record}', [ProgressController::class, 'destroy'])->name('progress.destroy');

    Route::get('videos', [VideoController::class, 'index'])->name('videos.index');
    Route::post('videos', [VideoController::class, 'store'])->middleware('role:admin,manager,teacher')->name('videos.store');
    Route::put('videos/{video}', [VideoController::class, 'update'])->name('videos.update');
    Route::delete('videos/{video}', [VideoController::class, 'destroy'])->name('videos.destroy');

    Route::get('chat', [ChatController::class, 'index'])->name('chat.index');
    Route::get('chat/{halaqa}', [ChatController::class, 'show'])->name('chat.show');
    Route::get('chat/{halaqa}/messages', [ChatController::class, 'messages'])->name('chat.messages');
    Route::post('chat/{halaqa}/messages', [ChatController::class, 'store'])->middleware('throttle:60,1')->name('chat.messages.store');
    Route::post('chat/{halaqa}/read', [ChatController::class, 'read'])->name('chat.read');
    Route::delete('chat/messages/{message}', [ChatController::class, 'destroy'])->name('chat.messages.destroy');

    // The questions community, shared by every member of the platform.
    Route::get('community', [CommunityPostController::class, 'index'])->name('community.index');
    Route::get('community/similar', [CommunityPostController::class, 'similar'])->middleware('throttle:60,1')->name('community.similar');
    Route::post('community', [CommunityPostController::class, 'store'])->middleware('throttle:20,1')->name('community.store');
    Route::get('community/{post}', [CommunityPostController::class, 'show'])->whereNumber('post')->name('community.show');
    Route::put('community/{post}', [CommunityPostController::class, 'update'])->whereNumber('post')->name('community.update');
    Route::delete('community/{post}', [CommunityPostController::class, 'destroy'])->whereNumber('post')->name('community.destroy');
    Route::post('community/{post}/replies', [CommunityReplyController::class, 'store'])->whereNumber('post')->middleware('throttle:20,1')->name('community.replies.store');
    Route::put('community/replies/{reply}', [CommunityReplyController::class, 'update'])->name('community.replies.update');
    Route::delete('community/replies/{reply}', [CommunityReplyController::class, 'destroy'])->name('community.replies.destroy');
    Route::patch('community/replies/{reply}/accept', [CommunityReplyController::class, 'accept'])->name('community.replies.accept');

    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('notifications/latest', [NotificationController::class, 'latest'])->name('notifications.latest');
    Route::post('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');
    Route::post('notifications/{id}/read', [NotificationController::class, 'read'])->name('notifications.read');
    Route::get('notifications/{id}/open', [NotificationController::class, 'open'])->name('notifications.open');

    Route::post('push-subscriptions', [PushSubscriptionController::class, 'store'])->name('push-subscriptions.store');
    Route::delete('push-subscriptions', [PushSubscriptionController::class, 'destroy'])->name('push-subscriptions.destroy');
    Route::post('push-subscriptions/test', [PushSubscriptionController::class, 'test'])->middleware('throttle:6,1')->name('push-subscriptions.test');

    Route::get('kids', KidsController::class)->name('kids.index');
    Route::post('recitation/transcribe', RecitationTranscriptionController::class)->middleware('throttle:240,1')->name('recitation.transcribe');
    Route::get('speech', SpeechController::class)->middleware('throttle:300,1')->name('speech');

    Route::get('kids-stories', [StoryController::class, 'kidsIndex'])->name('kids-stories.index');
    Route::get('kids-stories/{slug}', [StoryController::class, 'kidsShow'])->where('slug', '[a-z0-9-]+')->name('kids-stories.show');
    Route::get('prophets-stories', [StoryController::class, 'prophetsIndex'])->name('prophets-stories.index');
    Route::get('prophets-stories/{slug}', [StoryController::class, 'prophetsShow'])->where('slug', '[a-z0-9-]+')->name('prophets-stories.show');

    Route::get('prayers', [PrayerController::class, 'index'])->name('prayers.index');
    Route::get('prayers/{slug}', [PrayerController::class, 'show'])->where('slug', '[a-z-]+')->name('prayers.show');
    Route::put('prayers/reminders/{prayer}', [PrayerReminderController::class, 'update'])->name('prayers.reminders.update');

    Route::get('deeds', [DeedController::class, 'index'])->name('deeds.index');
    Route::get('deeds/reports', DeedReportController::class)->name('deeds.reports');
    Route::post('deeds', [DeedController::class, 'store'])->name('deeds.store');
    Route::put('deeds/{deed}', [DeedController::class, 'update'])->name('deeds.update');
    Route::delete('deeds/{deed}', [DeedController::class, 'destroy'])->name('deeds.destroy');
    Route::patch('deeds/{deed}/repent', [DeedController::class, 'repent'])->name('deeds.repent');

    Route::middleware('role:admin,manager,teacher')->group(function () {
        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('reports/attendance', [ReportController::class, 'attendance'])->name('reports.attendance');
        Route::get('reports/progress', [ReportController::class, 'progress'])->name('reports.progress');
    });

    Route::get('reports/students/{student}', [ReportController::class, 'student'])->name('reports.student');
});
