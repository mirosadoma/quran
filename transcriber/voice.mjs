/**
 * Text to speech with a man's Arabic voice, to read the tafsir and the stories aloud: Piper
 * (https://github.com/rhasspy/piper, MIT) with the voice "kareem". Piper adds the diacritics itself
 * (libtashkeel), so plain Arabic text is read correctly. The program and the voice are downloaded
 * once, into ./bin and ./models/piper; one Piper process stays open and reads the texts in turn.
 *
 * Settings (environment variables):
 *   TRANSCRIBER_VOICE  the Piper voice (path in huggingface.co/rhasspy/piper-voices, without .onnx)
 *   TRANSCRIBER_PIPER  path of a Piper program already installed (instead of downloading it)
 */

import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { readFile, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { Mp3Encoder } from '@breezystack/lamejs';

const HERE = dirname(fileURLToPath(import.meta.url));
const RELEASE = 'https://github.com/rhasspy/piper/releases/download/2023.11.14-2/';
const VOICES = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/';
const VOICE = process.env.TRANSCRIBER_VOICE || 'ar/ar_JO/kareem/medium/ar_JO-kareem-medium';
/** A text taking longer than this to read is given up. */
const TIMEOUT_MS = 30000;

const ARCHIVES = {
    'win32-x64': 'piper_windows_amd64.zip',
    'linux-x64': 'piper_linux_x86_64.tar.gz',
    'linux-arm64': 'piper_linux_aarch64.tar.gz',
    'darwin-x64': 'piper_macos_x64.tar.gz',
    'darwin-arm64': 'piper_macos_aarch64.tar.gz',
};

/** installing, ready or unavailable (shown by /health). */
export let voiceState = 'installing';

const binDir = join(HERE, 'bin', 'piper');
const program = process.env.TRANSCRIBER_PIPER || join(binDir, process.platform === 'win32' ? 'piper.exe' : 'piper');
const model = join(HERE, 'models', 'piper', `${basename(VOICE)}.onnx`);

async function download(url, file) {
    const response = await fetch(url, { redirect: 'follow' });

    if (!response.ok || !response.body) {
        throw new Error(`${url} answered ${response.status}`);
    }

    mkdirSync(dirname(file), { recursive: true });
    await pipeline(Readable.fromWeb(response.body), createWriteStream(`${file}.part`));
    await rename(`${file}.part`, file);
}

/**
 * Download the program and the voice when they are missing.
 */
async function install() {
    if (!existsSync(program)) {
        const archive = ARCHIVES[`${process.platform}-${process.arch}`];

        if (!archive) {
            throw new Error(`No Piper program for ${process.platform}-${process.arch}: set TRANSCRIBER_PIPER.`);
        }

        console.log(`Downloading Piper (${archive})…`);
        const file = join(HERE, 'bin', archive);
        await download(RELEASE + archive, file);
        // tar of Windows (bsdtar) opens zip files too.
        execFileSync(process.platform === 'win32' ? join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : 'tar', ['-xf', file, '-C', join(HERE, 'bin')]);
        await rm(file, { force: true });
    }

    for (const extension of ['.onnx', '.onnx.json']) {
        if (!existsSync(model.replace(/\.onnx$/, extension))) {
            console.log(`Downloading the voice ${basename(VOICE)}${extension}…`);
            await download(`${VOICES}${VOICE}${extension}`, model.replace(/\.onnx$/, extension));
        }
    }
}

let piper = null;
const waiting = new Map();

function startPiper() {
    const child = spawn(program, ['--model', model, '--json-input', '--quiet'], {
        cwd: dirname(program),
        env: { ...process.env, LD_LIBRARY_PATH: [dirname(program), process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') },
    });

    // Piper writes the path of every file it has finished.
    createInterface({ input: child.stdout }).on('line', (line) => {
        const id = line.match(/rattil-voice-([\w-]+)\.wav/)?.[1];
        const request = id ? waiting.get(id) : undefined;

        if (request) {
            waiting.delete(id);
            request.resolve();
        }
    });
    child.stderr.on('data', (data) => console.error(`[piper] ${String(data).trim()}`));
    child.on('exit', () => {
        piper = null;

        for (const [id, request] of waiting) {
            waiting.delete(id);
            request.reject(new Error('Piper stopped.'));
        }
    });

    return child;
}

/**
 * MP3 of 16-bit mono WAV (Piper's output), 48 kbit/s: small enough to be kept and sent to phones.
 */
function toMp3(wav) {
    let offset = 12;
    let rate = 22050;
    let data = null;

    while (offset + 8 <= wav.length) {
        const id = wav.toString('ascii', offset, offset + 4);
        const size = wav.readUInt32LE(offset + 4);

        if (id === 'fmt ') {
            rate = wav.readUInt32LE(offset + 12);
        } else if (id === 'data') {
            data = wav.subarray(offset + 8, Math.min(wav.length, offset + 8 + size));
            break;
        }

        offset += 8 + size + (size % 2);
    }

    const samples = new Int16Array(data.buffer.slice(data.byteOffset, data.byteOffset + (data.length - (data.length % 2))));
    const encoder = new Mp3Encoder(1, rate, 48);
    const parts = [];

    for (let index = 0; index < samples.length; index += 1152) {
        parts.push(Buffer.from(encoder.encodeBuffer(samples.subarray(index, index + 1152))));
    }

    parts.push(Buffer.from(encoder.flush()));

    return Buffer.concat(parts);
}

export const voiceReady = install()
    .then(() => {
        voiceState = 'ready';
        console.log(`Voice ready: ${basename(VOICE)}`);
    })
    .catch((error) => {
        voiceState = 'unavailable';
        console.error('The voice could not be prepared:', error.message);
    });

/**
 * The text read aloud, as MP3.
 */
export async function speak(text) {
    await voiceReady;

    if (voiceState !== 'ready') {
        throw new Error('The voice is not available.');
    }

    piper ??= startPiper();

    const id = randomUUID();
    const file = join(tmpdir(), `rattil-voice-${id}.wav`);
    const finished = new Promise((resolve, reject) => {
        waiting.set(id, { resolve, reject });
        setTimeout(() => {
            if (waiting.delete(id)) {
                reject(new Error('The text took too long to read.'));
            }
        }, TIMEOUT_MS);
    });

    piper.stdin.write(`${JSON.stringify({ text, output_file: file })}\n`);

    try {
        await finished;

        return toMp3(await readFile(file));
    } finally {
        await rm(file, { force: true });
    }
}
