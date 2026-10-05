<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" dir="{{ app()->getLocale() === 'ar' ? 'rtl' : 'ltr' }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="description" content="{{ $branding['description'] }}">
        {{-- Matches the page background so the installed app's status / title bar blends in (updated with the theme) --}}
        <meta name="theme-color" content="#f6f3ec">
        <link rel="icon" href="{{ $branding['icons']['favicon'] }}" type="{{ $branding['icons']['favicon_type'] }}">
        <link rel="apple-touch-icon" href="{{ $branding['icons']['apple-touch-icon'] }}">
        <link rel="manifest" href="{{ route('manifest', ['lang' => app()->getLocale()], false) }}">
        <meta name="mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-capable" content="yes">
        <meta name="apple-mobile-web-app-title" content="{{ $branding['name'] }}">
        <meta name="apple-mobile-web-app-status-bar-style" content="default">

        <script>
            (function () {
                try {
                    var theme = localStorage.getItem('theme');
                    var dark = theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    document.documentElement.classList.toggle('dark', dark);
                    document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#08110f' : '#f6f3ec');
                } catch (e) {}
            })();
        </script>

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
