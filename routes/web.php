<?php

use App\Http\Controllers\AdhkarController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\NewPasswordController;
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\ChatController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DhikrCategoryController;
use App\Http\Controllers\DhikrController;
use App\Http\Controllers\GoogleConnectionController;
use App\Http\Controllers\HalaqaAnnouncementController;
use App\Http\Controllers\HalaqaController;
use App\Http\Controllers\HalaqaStudentController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\ManifestController;
use App\Http\Controllers\MushafBookmarkController;
use App\Http\Controllers\MushafController;
use App\Http\Controllers\MushafHighlightController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProgressController;
use App\Http\Controllers\RecitationSubmissionController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\SessionMeetingController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\VideoController;
use App\Http\Controllers\Webhooks\JaasWebhookController;
use App\Http\Controllers\Webhooks\ZoomWebhookController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect()->route(auth()->check() ? 'dashboard' : 'login'))->name('home');

Route::post('locale', LocaleController::class)->name('locale');

// Fetched by browsers without cookies, so it skips the session middleware.
Route::get('manifest.webmanifest', ManifestController::class)->withoutMiddleware('web')->name('manifest');

Route::post('webhooks/zoom', ZoomWebhookController::class)->name('webhooks.zoom');
Route::post('webhooks/jaas', JaasWebhookController::class)->name('webhooks.jaas');

Route::middleware('guest')->group(function () {
    Route::get('login', [AuthenticatedSessionController::class, 'create'])->name('login');
    Route::post('login', [AuthenticatedSessionController::class, 'store'])->middleware('throttle:10,1')->name('login.store');
    Route::get('forgot-password', [PasswordResetLinkController::class, 'create'])->name('password.request');
    Route::post('forgot-password', [PasswordResetLinkController::class, 'store'])->middleware('throttle:5,1')->name('password.email');
    Route::get('reset-password/{token}', [NewPasswordController::class, 'create'])->name('password.reset');
    Route::post('reset-password', [NewPasswordController::class, 'store'])->name('password.store');
});

Route::middleware(['auth', 'active'])->group(function () {
    Route::post('logout', [AuthenticatedSessionController::class, 'destroy'])->name('logout');
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::get('profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::put('profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::put('profile/password', [ProfileController::class, 'password'])->name('profile.password');

    Route::middleware('role:admin')->group(function () {
        Route::resource('users', UserController::class);
        Route::patch('users/{user}/toggle-active', [UserController::class, 'toggleActive'])->name('users.toggle-active');

        Route::post('halaqat/{halaqa}/students', [HalaqaStudentController::class, 'store'])->name('halaqat.students.store');
        Route::delete('halaqat/{halaqa}/students/{student}', [HalaqaStudentController::class, 'destroy'])->name('halaqat.students.destroy');

        Route::get('settings', [SettingsController::class, 'edit'])->name('settings.edit');
        Route::put('settings', [SettingsController::class, 'update'])->name('settings.update');
        Route::get('settings/google/connect', [GoogleConnectionController::class, 'redirect'])->name('settings.google.connect');
        Route::get('settings/google/callback', [GoogleConnectionController::class, 'callback'])->name('settings.google.callback');
        Route::delete('settings/google', [GoogleConnectionController::class, 'destroy'])->name('settings.google.disconnect');

        Route::post('adhkar/categories', [DhikrCategoryController::class, 'store'])->name('adhkar.categories.store');
        Route::put('adhkar/categories/{category}', [DhikrCategoryController::class, 'update'])->name('adhkar.categories.update');
        Route::patch('adhkar/categories/{category}/toggle', [DhikrCategoryController::class, 'toggle'])->name('adhkar.categories.toggle');
        Route::delete('adhkar/categories/{category}', [DhikrCategoryController::class, 'destroy'])->name('adhkar.categories.destroy');
        Route::post('adhkar', [DhikrController::class, 'store'])->name('adhkar.store');
        Route::put('adhkar/{dhikr}', [DhikrController::class, 'update'])->name('adhkar.update');
        Route::patch('adhkar/{dhikr}/toggle', [DhikrController::class, 'toggle'])->name('adhkar.toggle');
        Route::delete('adhkar/{dhikr}', [DhikrController::class, 'destroy'])->name('adhkar.destroy');
    });

    Route::get('mushaf', [MushafController::class, 'index'])->name('mushaf.index');
    Route::get('mushaf/pages/{page}', [MushafController::class, 'page'])->whereNumber('page')->name('mushaf.page');
    Route::get('mushaf/search', [MushafController::class, 'search'])->middleware('throttle:60,1')->name('mushaf.search');
    Route::get('mushaf/ayahs/{ayah}/tafsir', [MushafController::class, 'tafsir'])->whereNumber('ayah')->name('mushaf.tafsir');
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

    Route::middleware('role:admin,teacher')->group(function () {
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
    Route::post('progress', [ProgressController::class, 'store'])->middleware('role:admin,teacher')->name('progress.store');
    Route::put('progress/{record}', [ProgressController::class, 'update'])->name('progress.update');
    Route::delete('progress/{record}', [ProgressController::class, 'destroy'])->name('progress.destroy');

    Route::get('videos', [VideoController::class, 'index'])->name('videos.index');
    Route::post('videos', [VideoController::class, 'store'])->middleware('role:admin,teacher')->name('videos.store');
    Route::put('videos/{video}', [VideoController::class, 'update'])->name('videos.update');
    Route::delete('videos/{video}', [VideoController::class, 'destroy'])->name('videos.destroy');

    Route::get('chat', [ChatController::class, 'index'])->name('chat.index');
    Route::get('chat/{halaqa}', [ChatController::class, 'show'])->name('chat.show');
    Route::get('chat/{halaqa}/messages', [ChatController::class, 'messages'])->name('chat.messages');
    Route::post('chat/{halaqa}/messages', [ChatController::class, 'store'])->middleware('throttle:60,1')->name('chat.messages.store');
    Route::post('chat/{halaqa}/read', [ChatController::class, 'read'])->name('chat.read');
    Route::delete('chat/messages/{message}', [ChatController::class, 'destroy'])->name('chat.messages.destroy');

    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::get('notifications/latest', [NotificationController::class, 'latest'])->name('notifications.latest');
    Route::post('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');
    Route::post('notifications/{id}/read', [NotificationController::class, 'read'])->name('notifications.read');

    Route::middleware('role:admin,teacher')->group(function () {
        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('reports/attendance', [ReportController::class, 'attendance'])->name('reports.attendance');
        Route::get('reports/progress', [ReportController::class, 'progress'])->name('reports.progress');
    });

    Route::get('reports/students/{student}', [ReportController::class, 'student'])->name('reports.student');
});
