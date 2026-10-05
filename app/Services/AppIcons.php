<?php

namespace App\Services;

use App\Models\Setting;
use GdImage;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Icons of the installable app (PWA), the favicon and the Apple touch icon.
 *
 * The brand icons in public/icons are used until the academy uploads its own logo;
 * square PNG copies of that logo are then generated next to it on the public disk.
 */
class AppIcons
{
    /**
     * Generated variants: pixel size, share of the canvas the logo fills, and whether the background is opaque.
     * The operating system crops maskable and Apple icons, so the logo stays inside their safe zone.
     *
     * @var array<string, array{size: int, scale: float, opaque: bool}>
     */
    protected const VARIANTS = [
        'icon-192' => ['size' => 192, 'scale' => 1.0, 'opaque' => false],
        'icon-512' => ['size' => 512, 'scale' => 1.0, 'opaque' => false],
        'icon-maskable-512' => ['size' => 512, 'scale' => 0.62, 'opaque' => true],
        'apple-touch-icon' => ['size' => 180, 'scale' => 0.78, 'opaque' => true],
    ];

    /**
     * Root-relative icon URLs, so they keep working whether the site is opened over HTTP or HTTPS.
     *
     * @return array{icon-192: string, icon-512: string, icon-maskable-512: string, apple-touch-icon: string, favicon: string, favicon_type: string}
     */
    public function urls(): array
    {
        $logo = Setting::get('academy_logo');

        if ($logo && $this->ensureGenerated($logo)) {
            $urls = [];

            foreach (array_keys(self::VARIANTS) as $name) {
                $urls[$name] = $this->publicUrl($this->path($logo, $name));
            }

            return [...$urls, 'favicon' => $urls['icon-192'], 'favicon_type' => 'image/png'];
        }

        return [
            'icon-192' => '/icons/icon-192.png',
            'icon-512' => '/icons/icon-512.png',
            'icon-maskable-512' => '/icons/icon-maskable-512.png',
            'apple-touch-icon' => '/icons/apple-touch-icon.png',
            'favicon' => '/favicon.svg',
            'favicon_type' => 'image/svg+xml',
        ];
    }

    /**
     * Create every icon variant from a logo stored on the public disk.
     */
    public function generate(string $logo): bool
    {
        try {
            $source = imagecreatefromstring((string) Storage::disk('public')->get($logo));

            if (! $source instanceof GdImage) {
                return false;
            }

            imagepalettetotruecolor($source);
            $background = $this->backgroundColor($source);

            foreach (self::VARIANTS as $name => $variant) {
                Storage::disk('public')->put($this->path($logo, $name), $this->render($source, $variant, $background));
            }

            return true;
        } catch (Throwable $exception) {
            Log::warning('Could not create app icons from the academy logo.', ['logo' => $logo, 'error' => $exception->getMessage()]);

            return false;
        }
    }

    /**
     * Remove the icons generated from a logo.
     */
    public function delete(string $logo): void
    {
        Storage::disk('public')->delete(array_map(fn (string $name): string => $this->path($logo, $name), array_keys(self::VARIANTS)));
        Cache::forget($this->failureKey($logo));
    }

    /**
     * Generate the icons on first use (e.g. a logo uploaded before icons existed).
     * A logo that cannot be read is not retried for a day.
     */
    protected function ensureGenerated(string $logo): bool
    {
        $disk = Storage::disk('public');
        $complete = collect(array_keys(self::VARIANTS))->every(fn (string $name): bool => $disk->exists($this->path($logo, $name)));

        if ($complete) {
            return true;
        }

        if (Cache::has($this->failureKey($logo))) {
            return false;
        }

        if ($this->generate($logo)) {
            return true;
        }

        Cache::put($this->failureKey($logo), true, now()->addDay());

        return false;
    }

    /**
     * Draw the logo centered on a square canvas and return it as PNG data.
     *
     * @param  array{size: int, scale: float, opaque: bool}  $variant
     * @param  array{0: int, 1: int, 2: int}  $background
     */
    protected function render(GdImage $source, array $variant, array $background): string
    {
        $size = $variant['size'];
        $canvas = imagecreatetruecolor($size, $size);

        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);

        $fill = $variant['opaque']
            ? imagecolorallocate($canvas, ...$background)
            : imagecolorallocatealpha($canvas, 0, 0, 0, 127);

        imagefilledrectangle($canvas, 0, 0, $size - 1, $size - 1, $fill);
        imagealphablending($canvas, true);

        $width = imagesx($source);
        $height = imagesy($source);
        $ratio = min($size * $variant['scale'] / $width, $size * $variant['scale'] / $height);
        $targetWidth = max(1, (int) round($width * $ratio));
        $targetHeight = max(1, (int) round($height * $ratio));

        imagecopyresampled(
            $canvas, $source,
            intdiv($size - $targetWidth, 2), intdiv($size - $targetHeight, 2), 0, 0,
            $targetWidth, $targetHeight, $width, $height,
        );

        ob_start();
        imagepng($canvas, null, 9);

        return (string) ob_get_clean();
    }

    /**
     * The logo's own background (its top-left pixel), or white when the logo is transparent.
     *
     * @return array{0: int, 1: int, 2: int}
     */
    protected function backgroundColor(GdImage $image): array
    {
        $pixel = imagecolorsforindex($image, imagecolorat($image, 0, 0));

        return $pixel['alpha'] === 0 ? [$pixel['red'], $pixel['green'], $pixel['blue']] : [255, 255, 255];
    }

    protected function path(string $logo, string $variant): string
    {
        return 'branding/icons/'.pathinfo($logo, PATHINFO_FILENAME)."-{$variant}.png";
    }

    protected function publicUrl(string $path): string
    {
        $url = Storage::disk('public')->url($path);

        return (string) (parse_url($url, PHP_URL_PATH) ?: $url);
    }

    protected function failureKey(string $logo): string
    {
        return 'app-icons-failed:'.$logo;
    }
}
