<?php

namespace App\Services;

use App\Models\HalaqaSession;
use Illuminate\Http\File;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Session recordings uploaded from the teacher's device in chunks (a lesson video can be
 * hundreds of megabytes, more than most servers accept in one request). The chunks are
 * appended to a part file; once the last one arrives the video goes to the recordings disk.
 */
class RecordingUploads
{
    /**
     * Video containers the browsers play.
     *
     * @var list<string>
     */
    public const EXTENSIONS = ['mp4', 'webm', 'm4v', 'mov', 'mkv', 'ogv'];

    protected const PART_DIRECTORY = 'recording-uploads';

    /**
     * Size of one chunk: 8 MB, or less when PHP accepts less per request.
     */
    public function chunkSize(): int
    {
        $limits = array_filter([
            8 * 1024 * 1024,
            static::iniBytes(ini_get('upload_max_filesize')),
            static::iniBytes(ini_get('post_max_size')) - 512 * 1024,
        ], fn (int $bytes): bool => $bytes > 0);

        return max(256 * 1024, min($limits));
    }

    /**
     * The largest recording accepted.
     */
    public function maxBytes(): int
    {
        return (int) config('meetings.recording_max_mb', 2048) * 1024 * 1024;
    }

    /**
     * What the browser needs to upload a recording.
     *
     * @return array{chunk_size: int, max_bytes: int, extensions: list<string>}
     */
    public function options(): array
    {
        return ['chunk_size' => $this->chunkSize(), 'max_bytes' => $this->maxBytes(), 'extensions' => self::EXTENSIONS];
    }

    /**
     * Append one chunk; the last one stores the recording and returns its address.
     *
     * @throws ValidationException
     */
    public function storeChunk(HalaqaSession $session, string $uploadId, int $index, int $total, int $size, string $name, UploadedFile $chunk): ?string
    {
        $extension = Str::lower(pathinfo($name, PATHINFO_EXTENSION));

        if (! in_array($extension, self::EXTENSIONS, true)) {
            throw ValidationException::withMessages(['file' => __('Choose a video file (:extensions).', ['extensions' => implode(', ', self::EXTENSIONS)])]);
        }

        if ($size > $this->maxBytes()) {
            throw ValidationException::withMessages(['file' => __('The video is larger than :max MB.', ['max' => (int) ($this->maxBytes() / 1024 / 1024)])]);
        }

        $part = $this->partPath($session, $uploadId);

        if ($index === 0 && is_file($part)) {
            unlink($part);
        }

        clearstatcache(true, $part);

        if ($index > 0 && ! is_file($part)) {
            throw ValidationException::withMessages(['file' => __('The upload was interrupted. Start it again.')]);
        }

        $this->append($part, $chunk);

        if ($index < $total - 1) {
            return null;
        }

        try {
            clearstatcache(true, $part);

            if (filesize($part) !== $size) {
                throw ValidationException::withMessages(['file' => __('The upload was interrupted. Start it again.')]);
            }

            $path = Storage::disk($this->disk())->putFileAs(
                'recordings',
                new File($part),
                "session-{$session->id}-".now()->format('YmdHis').'.'.$extension,
            );
        } finally {
            if (is_file($part)) {
                unlink($part);
            }
        }

        $this->deleteFile($session);
        $session->update(['recording_path' => $path]);

        return $this->url($session);
    }

    /**
     * Remove the uploaded recording of the session.
     */
    public function delete(HalaqaSession $session): void
    {
        $this->deleteFile($session);
        $session->update(['recording_path' => null]);
    }

    /**
     * The address of the uploaded recording, if any.
     */
    public function url(HalaqaSession $session): ?string
    {
        return $session->recording_path ? Storage::disk($this->disk())->url($session->recording_path) : null;
    }

    protected function deleteFile(HalaqaSession $session): void
    {
        if ($session->recording_path) {
            Storage::disk($this->disk())->delete($session->recording_path);
        }
    }

    protected function disk(): string
    {
        return (string) config('meetings.recordings_disk');
    }

    protected function partPath(HalaqaSession $session, string $uploadId): string
    {
        $directory = storage_path('app/private/'.self::PART_DIRECTORY);

        if (! is_dir($directory)) {
            mkdir($directory, 0755, true);
        }

        return $directory.'/session-'.$session->id.'-'.preg_replace('/[^A-Za-z0-9-]/', '', $uploadId).'.part';
    }

    protected function append(string $part, UploadedFile $chunk): void
    {
        $in = fopen($chunk->getRealPath(), 'rb');
        $out = fopen($part, 'ab');

        if ($in === false || $out === false) {
            throw ValidationException::withMessages(['file' => __('The upload was interrupted. Start it again.')]);
        }

        stream_copy_to_stream($in, $out);
        fclose($in);
        fclose($out);
    }

    /**
     * "2G", "512M" or "8192K" from php.ini as bytes.
     */
    public static function iniBytes(string|false $value): int
    {
        $value = trim((string) $value);

        if ($value === '' || $value === '-1') {
            return 0;
        }

        $unit = Str::lower(substr($value, -1));
        $number = (float) $value;

        return (int) match ($unit) {
            'g' => $number * 1024 ** 3,
            'm' => $number * 1024 ** 2,
            'k' => $number * 1024,
            default => $number,
        };
    }
}
