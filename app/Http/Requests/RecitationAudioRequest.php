<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RecitationAudioRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * The recording of one recited passage: a WAV file (the browser sends 16 kHz mono, about 30 s at most).
     * A partial one is the passage so far, while the reader is still speaking.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'audio' => ['required', 'file', 'max:8192', 'mimetypes:audio/wav,audio/x-wav,audio/wave,audio/vnd.wave'],
            'partial' => ['sometimes', 'boolean'],
        ];
    }
}
