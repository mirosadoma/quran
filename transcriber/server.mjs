/**
 * Speech to text for Quran recitation that keeps the diacritics (fatha, damma, kasra…), so the platform
 * can tell which vowel the reader said. The Laravel app sends the recording of one recited passage as a
 * WAV file to POST /transcribe and receives { "text": "…" }.
 *
 * The model is Whisper fine-tuned on Quran recitation (tarteel-ai/whisper-base-ar-quran) in the ONNX
 * format; it is downloaded once (about 400 MB) into ./models.
 *
 *   cd transcriber && npm install && npm start
 *
 * Settings (environment variables, also read from the .env of the Laravel app one folder up):
 *   TRANSCRIBER_HOST   address to listen on (127.0.0.1: only the Laravel app on the same server can call it)
 *   TRANSCRIBER_PORT   port (by default the one of TRANSCRIBER_URL, or 8787)
 *   TRANSCRIBER_TOKEN  shared secret: requests must send "Authorization: Bearer <token>" (the same
 *                      TRANSCRIBER_TOKEN in the .env of Laravel); empty = no check
 *   TRANSCRIBER_MODEL  Hugging Face id of the model (ONNX)
 *   TRANSCRIBER_DTYPE  precision of the weights: fp32 (default, the most accurate) or q8 (less memory)
 *
 * POST /transcribe?partial=1 is the passage being read so far (to show its words before the pause):
 * it is refused at once when the model is busy, the final passages count more.
 *
 * POST /speak {"text": "…"} reads a text aloud with a man's voice, as MP3 (see voice.mjs): for the
 * tafsir and the stories.
 */

import './env.mjs';
import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { env, pipeline } from '@huggingface/transformers';
import { speak, voiceState } from './voice.mjs';

function portOf(url) {
    try {
        return url ? Number(new URL(url).port) || null : null;
    } catch {
        return null;
    }
}

const HOST = process.env.TRANSCRIBER_HOST || '127.0.0.1';
const PORT = Number(process.env.TRANSCRIBER_PORT || portOf(process.env.TRANSCRIBER_URL) || 8787);
const TOKEN = process.env.TRANSCRIBER_TOKEN || '';
const MODEL = process.env.TRANSCRIBER_MODEL || 'YunusZJ/whisper-base-ar-quran-ONNX';
const DTYPE = process.env.TRANSCRIBER_DTYPE || 'fp32';

const SAMPLE_RATE = 16000;
/** Longest recording accepted (seconds) and largest request body (bytes). */
const MAX_SECONDS = 120;
const MAX_BYTES = 12 * 1024 * 1024;
/** Requests waiting for the model beyond this number are refused: the server is overloaded. */
const MAX_WAITING = 24;

class TooLarge extends Error {}

env.cacheDir = fileURLToPath(new URL('./models/', import.meta.url));

let recognizer = null;

const loading = pipeline('automatic-speech-recognition', MODEL, { dtype: DTYPE }).then((loaded) => {
    recognizer = loaded;
    console.log(`Model ready: ${MODEL} (${DTYPE})`);

    return loaded;
});

loading.catch((error) => {
    console.error('The model could not be loaded:', error);
    process.exit(1);
});

// One recording at a time: the model uses all the processor cores.
let queue = Promise.resolve();
let waiting = 0;

function enqueue(job) {
    waiting++;
    const run = queue.then(job).finally(() => {
        waiting--;
    });
    queue = run.catch(() => undefined);

    return run;
}

/**
 * Mono samples at 16 kHz from a WAV file (PCM 16-bit or 32-bit float, any rate and channels), or null.
 */
function decodeWav(buffer) {
    if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
        return null;
    }

    let offset = 12;
    let format = null;
    let data = null;

    while (offset + 8 <= buffer.length) {
        const id = buffer.toString('ascii', offset, offset + 4);
        const size = buffer.readUInt32LE(offset + 4);
        const body = offset + 8;

        if (id === 'fmt ' && body + 16 <= buffer.length) {
            format = { code: buffer.readUInt16LE(body), channels: buffer.readUInt16LE(body + 2), rate: buffer.readUInt32LE(body + 4), bits: buffer.readUInt16LE(body + 14) };
        } else if (id === 'data') {
            data = buffer.subarray(body, Math.min(buffer.length, body + size));
            break;
        }

        offset = body + size + (size % 2);
    }

    if (!format || !data || format.channels < 1 || format.rate < 8000) {
        return null;
    }

    const float = (format.code === 3 || format.code === 0xfffe) && format.bits === 32;
    const int16 = (format.code === 1 || format.code === 0xfffe) && format.bits === 16;

    if (!float && !int16) {
        return null;
    }

    const bytes = format.bits / 8;
    const frames = Math.floor(data.length / (bytes * format.channels));
    const mono = new Float32Array(frames);

    for (let frame = 0; frame < frames; frame++) {
        let sum = 0;

        for (let channel = 0; channel < format.channels; channel++) {
            const at = (frame * format.channels + channel) * bytes;
            sum += float ? data.readFloatLE(at) : data.readInt16LE(at) / 32768;
        }

        mono[frame] = sum / format.channels;
    }

    return { samples: resample(mono, format.rate), seconds: frames / format.rate };
}

function resample(samples, rate) {
    if (rate === SAMPLE_RATE) {
        return samples;
    }

    const ratio = rate / SAMPLE_RATE;
    const result = new Float32Array(Math.floor(samples.length / ratio));

    for (let index = 0; index < result.length; index++) {
        if (ratio > 1) {
            // Average the samples that make one output sample (a simple low-pass filter).
            const start = Math.floor(index * ratio);
            const end = Math.min(samples.length, Math.max(start + 1, Math.floor((index + 1) * ratio)));
            let sum = 0;

            for (let position = start; position < end; position++) {
                sum += samples[position];
            }

            result[index] = sum / (end - start);
        } else {
            const position = index * ratio;
            const before = Math.floor(position);
            const after = Math.min(before + 1, samples.length - 1);
            result[index] = samples[before] + (samples[after] - samples[before]) * (position - before);
        }
    }

    return result;
}

function peak(samples) {
    let max = 0;

    for (const sample of samples) {
        max = Math.max(max, Math.abs(sample));
    }

    return max;
}

async function transcribe(samples) {
    // Whisper invents words in silence: a recording without a voice has no text.
    if (peak(samples) < 0.01) {
        return '';
    }

    const model = recognizer ?? (await loading);
    const options = { language: 'arabic', task: 'transcribe' };

    if (samples.length > 30 * SAMPLE_RATE) {
        options.chunk_length_s = 30;
        options.stride_length_s = 5;
    }

    const output = await model(samples, options);

    return String((Array.isArray(output) ? output[0]?.text : output?.text) ?? '').trim();
}

function authorized(request) {
    if (TOKEN === '') {
        return true;
    }

    const given = Buffer.from(String(request.headers.authorization ?? ''));
    const wanted = Buffer.from(`Bearer ${TOKEN}`);

    return given.length === wanted.length && timingSafeEqual(given, wanted);
}

function readBody(request) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;

        request.on('data', (chunk) => {
            size += chunk.length;

            if (size <= MAX_BYTES) {
                chunks.push(chunk);
            }
        });
        request.on('end', () => (size > MAX_BYTES ? reject(new TooLarge()) : resolve(Buffer.concat(chunks))));
        request.on('error', reject);
    });
}

function send(response, status, body) {
    response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify(body));
}

/**
 * POST /speak {"text": "…"}: the text read aloud by the man's voice, as MP3 (see voice.mjs).
 */
async function speakText(request, response) {
    let text = '';

    try {
        text = String(JSON.parse((await readBody(request)).toString('utf8')).text ?? '').trim();
    } catch {
        // Not JSON: refused below.
    }

    if (text === '' || text.length > 1000) {
        return send(response, 422, { message: 'Send {"text": "…"} with 1 to 1000 characters.' });
    }

    if (voiceState === 'unavailable') {
        return send(response, 503, { message: 'The voice is not available.' });
    }

    const started = Date.now();
    const audio = await speak(text);
    console.log(`${text.length} characters read aloud in ${Date.now() - started} ms`);
    response.writeHead(200, { 'Content-Type': 'audio/mpeg', 'Content-Length': audio.length });
    response.end(audio);
}

const server = createServer(async (request, response) => {
    const { pathname, searchParams } = new URL(request.url ?? '/', 'http://localhost');
    const partial = searchParams.get('partial') === '1';

    try {
        if (request.method === 'GET' && pathname === '/health') {
            return send(response, 200, { status: recognizer ? 'ready' : 'loading', model: MODEL, waiting, voice: voiceState });
        }

        if (request.method !== 'POST' || (pathname !== '/transcribe' && pathname !== '/speak')) {
            return send(response, 404, { message: 'Not found.' });
        }

        if (!authorized(request)) {
            return send(response, 401, { message: 'Unauthorized.' });
        }

        if (pathname === '/speak') {
            return await speakText(request, response);
        }

        // A passage still being read is worth it only if the model is free right now.
        if (waiting >= MAX_WAITING || (partial && waiting > 0)) {
            return send(response, 503, { message: 'Busy, try again in a moment.' });
        }

        const audio = decodeWav(await readBody(request));

        if (!audio) {
            return send(response, 422, { message: 'Send a WAV recording (PCM 16-bit or 32-bit float).' });
        }

        if (audio.seconds > MAX_SECONDS) {
            return send(response, 413, { message: `The recording is longer than ${MAX_SECONDS} seconds.` });
        }

        const started = Date.now();
        const text = await enqueue(() => transcribe(audio.samples));
        console.log(`${audio.seconds.toFixed(1)} s${partial ? ' (partial)' : ''} transcribed in ${Date.now() - started} ms`);

        return send(response, 200, { text });
    } catch (error) {
        if (error instanceof TooLarge) {
            return send(response, 413, { message: 'The recording is too large.' });
        }

        console.error(error);

        return send(response, 500, { message: 'The recording could not be transcribed.' });
    }
});

server.listen(PORT, HOST, () => console.log(`Transcriber listening on http://${HOST}:${PORT}`));

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.close(() => process.exit(0)));
}
