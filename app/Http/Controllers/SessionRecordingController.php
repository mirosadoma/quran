<?php

namespace App\Http\Controllers;

use App\Models\HalaqaSession;
use App\Services\RecordingUploads;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * The video of a session uploaded by its teacher, shown to the students inside the platform.
 */
class SessionRecordingController extends Controller
{
    public function __construct(protected RecordingUploads $uploads) {}

    /**
     * Receive one chunk of the video; the last chunk stores the recording.
     */
    public function storeChunk(Request $request, HalaqaSession $session): JsonResponse
    {
        $this->authorize('update', $session);

        $validated = $request->validate([
            'upload_id' => ['required', 'string', 'regex:/^[A-Za-z0-9-]{8,64}$/'],
            'index' => ['required', 'integer', 'min:0'],
            'total' => ['required', 'integer', 'min:1', 'max:5000'],
            'size' => ['required', 'integer', 'min:1'],
            'name' => ['required', 'string', 'max:255'],
            'chunk' => ['required', 'file'],
        ]);

        $url = $this->uploads->storeChunk(
            $session,
            $validated['upload_id'],
            (int) $validated['index'],
            (int) $validated['total'],
            (int) $validated['size'],
            $validated['name'],
            $request->file('chunk'),
        );

        return response()->json(['done' => $url !== null, 'url' => $url]);
    }

    /**
     * Remove the uploaded video.
     */
    public function destroy(HalaqaSession $session): RedirectResponse
    {
        $this->authorize('update', $session);

        $this->uploads->delete($session);

        $this->toast(__('The recording was removed.'));

        return back();
    }
}
