<?php

namespace App\Jobs;

use App\Models\HalaqaSession;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Http\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * Copies a meeting recording (JaaS links expire after 24 hours) to the platform storage.
 */
class DownloadRecording implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 900;

    /**
     * Create a new job instance.
     */
    public function __construct(public HalaqaSession $session, public string $url) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $temporary = tempnam(sys_get_temp_dir(), 'recording');

        try {
            Http::timeout(850)->sink($temporary)->get($this->url)->throw();

            $path = Storage::disk(config('meetings.recordings_disk'))->putFileAs(
                'recordings',
                new File($temporary),
                "session-{$this->session->id}-".now()->format('YmdHis').'.mp4',
            );

            $this->session->update(['recording_path' => $path]);
        } finally {
            if (is_file($temporary)) {
                unlink($temporary);
            }
        }
    }
}
