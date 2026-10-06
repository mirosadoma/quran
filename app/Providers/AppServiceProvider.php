<?php

namespace App\Providers;

use App\Models\Setting;
use App\Services\AppIcons;
use App\Services\Quran;
use Illuminate\Contracts\View\View as ViewContract;
use Illuminate\Foundation\DevCommands;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;
use Inertia\ExceptionResponse;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(Quran::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        DevCommands::artisan('schedule:work', 'scheduler');

        // The vowel check of recitations (transcriber/), once it is set up.
        if ($this->app->runningInConsole() && filled(config('services.transcriber.url')) && is_dir(base_path('transcriber/node_modules'))) {
            DevCommands::register('node transcriber/server.mjs', 'transcriber');
        }

        $this->renderErrorPages();
        $this->shareBranding();
    }

    /**
     * Academy name and icons for the root page (favicon, Apple touch icon, installable app tags).
     */
    protected function shareBranding(): void
    {
        View::composer('app', function (ViewContract $view): void {
            $view->with('branding', [
                'name' => Setting::get('academy_name'),
                'description' => Setting::get('academy_tagline') ?: __('Quran memorization platform'),
                'icons' => app(AppIcons::class)->urls(),
            ]);
        });
    }

    /**
     * Render friendly Inertia pages for HTTP errors.
     */
    protected function renderErrorPages(): void
    {
        Inertia::handleExceptionsUsing(function (ExceptionResponse $response) {
            /** @var Request $request */
            $request = $response->request;
            $status = $response->statusCode();

            if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                return null;
            }

            if ($status === 419) {
                Inertia::flash('toast', ['type' => 'error', 'message' => __('The page expired. Please try again.')]);

                return back();
            }

            $statuses = config('app.debug') ? [403, 404] : [403, 404, 500, 503];

            if (in_array($status, $statuses, true)) {
                return $response->render('errors/error', ['status' => $status])->withSharedData();
            }

            return null;
        });
    }
}
