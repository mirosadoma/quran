/**
 * Cuts the sound of the microphone into passages at the reader's pauses, to send each passage for
 * speech recognition as soon as it ends. Works on 16 kHz mono samples.
 */

export const RATE = 16000;

/** Frames of 30 ms for telling the voice from silence. */
const FRAME = 480;
const FRAME_MS = 30;
/** A passage ends after this much silence; a long one is cut at a short pause, or anyway at the longest length. */
const PAUSE_MS = 450;
const LONG_S = 12;
const LONGEST_S = 25;
/** Kept from before the voice starts, so its first letter is not cut. */
const PREROLL_FRAMES = 10;
/** Less voice than this is noise (a cough, a click). */
const SHORTEST_VOICE_MS = 240;
/** The voice starts after this many frames above the noise. */
const ONSET_FRAMES = 3;
/** Silence kept at the end of a passage (frames). */
const TRAILING_FRAMES = 7;
/** While the reader speaks, what was said so far is given at most this often, once the passage has some voice. */
const PROGRESS_MS = 700;
const PROGRESS_VOICE_MS = 500;

export interface PassageEvents {
    /** A passage is over (the reader paused): its samples and its number. */
    onPassage: (samples: Float32Array, passage: number) => void;
    /**
     * The passage being recorded, so far (to show its words before the pause). Returns false when it
     * could not be taken now (an earlier one is still on its way): it is then given again at the next
     * sound instead of waiting for the next interval.
     */
    onProgress?: (samples: Float32Array, passage: number) => boolean;
}

export class VoicePassages {
    private frame: number[] = [];
    private preroll: Float32Array[] = [];
    private passage: Float32Array[] | null = null;
    private voiced = 0;
    private silence = 0;
    private onset = 0;
    private noise = 0.004;
    /** Passages started so far (the number of the current one is count - 1). */
    private count = 0;
    private sinceProgress = 0;
    private readonly events: PassageEvents;

    constructor(events: PassageEvents) {
        this.events = events;
    }

    /**
     * New samples from the microphone.
     */
    push(samples: Float32Array): void {
        for (const sample of samples) {
            this.frame.push(sample);

            if (this.frame.length === FRAME) {
                this.listen(Float32Array.from(this.frame));
                this.frame = [];
            }
        }
    }

    /**
     * The reader stopped: the passage being recorded is over.
     */
    end(): void {
        const frames = this.passage;
        this.passage = null;
        this.onset = 0;

        if (frames && this.voiced * FRAME_MS >= SHORTEST_VOICE_MS) {
            this.events.onPassage(concat(frames.slice(0, frames.length - Math.max(0, this.silence - TRAILING_FRAMES))), this.count - 1);
        }
    }

    /**
     * Forget everything heard (the recitation starts over).
     */
    clear(): void {
        this.frame = [];
        this.preroll = [];
        this.passage = null;
        this.onset = 0;
    }

    private listen(frame: Float32Array): void {
        const level = Math.sqrt(frame.reduce((total, value) => total + value * value, 0) / frame.length);
        const loud = level > Math.max(0.012, this.noise * 3);

        if (!loud) {
            this.noise = this.noise * 0.95 + level * 0.05;
        }

        if (this.passage === null) {
            this.preroll.push(frame);

            if (this.preroll.length > PREROLL_FRAMES) {
                this.preroll.shift();
            }

            this.onset = loud ? this.onset + 1 : 0;

            if (this.onset >= ONSET_FRAMES) {
                this.passage = this.preroll;
                this.preroll = [];
                this.voiced = this.onset;
                this.silence = 0;
                this.sinceProgress = 0;
                this.count++;
            }

            return;
        }

        this.passage.push(frame);
        this.voiced += loud ? 1 : 0;
        this.silence = loud ? 0 : this.silence + 1;
        this.sinceProgress++;

        const seconds = (this.passage.length * FRAME) / RATE;

        if (this.silence * FRAME_MS >= PAUSE_MS || (seconds >= LONG_S && this.silence >= 4) || seconds >= LONGEST_S) {
            this.end();

            return;
        }

        if (this.events.onProgress && loud && this.sinceProgress * FRAME_MS >= PROGRESS_MS && this.voiced * FRAME_MS >= PROGRESS_VOICE_MS) {
            if (this.events.onProgress(concat(this.passage), this.count - 1)) {
                this.sinceProgress = 0;
            }
        }
    }
}

/**
 * Turns samples at another rate into 16 kHz, averaging the samples of each output sample (a simple
 * low-pass filter). Keeps what is left between calls.
 */
export function downsampler(rate: number): (input: Float32Array) => Float32Array {
    const ratio = rate / RATE;
    let pending = new Float32Array(0);
    let offset = 0;

    return (input) => {
        const joined = new Float32Array(pending.length + input.length);
        joined.set(pending);
        joined.set(input, pending.length);

        const output: number[] = [];
        let start = offset;

        while (start + ratio <= joined.length) {
            const from = Math.floor(start);
            const to = Math.max(from + 1, Math.floor(start + ratio));
            let sum = 0;

            for (let index = from; index < to; index++) {
                sum += joined[index];
            }

            output.push(sum / (to - from));
            start += ratio;
        }

        const used = Math.floor(start);
        pending = joined.slice(used);
        offset = start - used;

        return Float32Array.from(output);
    };
}

export function concat(parts: Float32Array[]): Float32Array {
    const result = new Float32Array(parts.reduce((total, part) => total + part.length, 0));
    let offset = 0;

    for (const part of parts) {
        result.set(part, offset);
        offset += part.length;
    }

    return result;
}

/**
 * 16-bit PCM WAV file of mono 16 kHz samples.
 */
export function encodeWav(samples: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const text = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));

    text(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    text(8, 'WAVE');
    text(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, RATE, true);
    view.setUint32(28, RATE * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    text(36, 'data');
    view.setUint32(40, samples.length * 2, true);
    samples.forEach((sample, index) => view.setInt16(44 + index * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true));

    return buffer;
}
