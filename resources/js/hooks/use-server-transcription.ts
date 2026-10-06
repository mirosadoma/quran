import { isAxiosError } from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpeechError } from '@/hooks/use-speech-recognition';
import { withoutFinalVowel } from '@/lib/arabic';
import { http } from '@/lib/http';
import { concat, downsampler, encodeWav, RATE, VoicePassages } from '@/lib/voice-passages';

/** The recording kept to listen to it again (seconds). */
const KEPT_S = 300;

const WORKLET = `
class RattilCapture extends AudioWorkletProcessor {
    constructor() {
        super();
        this.buffer = new Float32Array(2048);
        this.length = 0;
    }

    process(inputs) {
        const channel = inputs[0] && inputs[0][0];

        if (channel) {
            for (let index = 0; index < channel.length; index++) {
                this.buffer[this.length++] = channel[index];

                if (this.length === this.buffer.length) {
                    this.port.postMessage(this.buffer.slice(0));
                    this.length = 0;
                }
            }
        }

        return true;
    }
}

registerProcessor('rattil-capture', RattilCapture);
`;

export function isServerTranscriptionSupported(): boolean {
    return typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof AudioWorkletNode !== 'undefined';
}

interface Capture {
    stream: MediaStream;
    context: AudioContext;
    node: AudioWorkletNode;
}

interface Passage {
    /** Its number (see VoicePassages). */
    number: number;
    done: boolean;
    text: string;
}

/**
 * Speech to text on the platform's server, which writes the diacritics so the vowels of a recitation
 * can be checked. The microphone is recorded in the browser and cut at the reader's pauses; every
 * passage is sent (WAV, 16 kHz mono) as soon as it ends, and the texts are put together in order.
 * While the reader speaks, the passage so far is also sent about every second: its text (interim)
 * shows the words before the pause, until the final text of the passage replaces it.
 */
export function useServerTranscription(): {
    supported: boolean;
    listening: boolean;
    /** Passages still being turned into text. */
    busy: boolean;
    transcript: string;
    final: string;
    interim: string;
    error: SpeechError | null;
    start: () => void;
    stop: () => void;
    reset: () => void;
    /** The recording of the reader (after stopping), to listen to it. */
    recording: string | null;
} {
    const [supported] = useState(isServerTranscriptionSupported);
    const [listening, setListening] = useState(false);
    const [busy, setBusy] = useState(false);
    const [final, setFinal] = useState('');
    const [interim, setInterim] = useState('');
    const [error, setError] = useState<SpeechError | null>(null);
    const [recording, setRecording] = useState<string | null>(null);
    const capture = useRef<Capture | null>(null);
    const wanted = useRef(false);
    // Every recitation gets a number; the texts of an older one are ignored.
    const session = useRef(0);
    const passages = useRef<Passage[]>([]);
    // The last passage whose final text is shown, the passage of the interim text, and one interim request at a time.
    const finished = useRef(-1);
    const interimOf = useRef(-1);
    const interimSent = useRef(false);
    const kept = useRef<Float32Array[]>([]);
    const keptLength = useRef(0);

    const publish = useCallback(() => {
        const texts: string[] = [];

        // The passages in order, up to the first one still waiting for its text.
        for (const item of passages.current) {
            if (!item.done) {
                break;
            }

            finished.current = item.number;

            if (item.text) {
                texts.push(item.text);
            }
        }

        setFinal(texts.join(' ').replace(/\s+/g, ' ').trim());
        setBusy(passages.current.some((item) => !item.done));

        // The final text of the passage replaces its interim text.
        if (interimOf.current !== -1 && interimOf.current <= finished.current) {
            interimOf.current = -1;
            setInterim('');
        }
    }, []);

    const release = useCallback(() => {
        const current = capture.current;
        capture.current = null;

        if (current) {
            current.node.port.onmessage = null;
            current.stream.getTracks().forEach((track) => track.stop());
            void current.context.close().catch(() => undefined);
        }
    }, []);

    const send = useCallback(
        (samples: Float32Array, number: number) => {
            const id = session.current;
            const item: Passage = { number, done: false, text: '' };
            const form = new FormData();

            passages.current.push(item);
            setBusy(true);
            form.append('audio', new Blob([encodeWav(samples)], { type: 'audio/wav' }), 'recitation.wav');

            http.post<{ text: string }>(route('recitation.transcribe'), form)
                .then(({ data }) => {
                    // The reader paused after this passage: its last letter is read with a sukun (waqf).
                    item.text = withoutFinalVowel(data.text ?? '');
                })
                .catch((exception: unknown) => {
                    if (id !== session.current) {
                        return;
                    }

                    // Without the text of this passage the next ones cannot be followed: stop listening.
                    wanted.current = false;
                    release();
                    setListening(false);
                    setError(isAxiosError(exception) && !exception.response ? 'network' : 'service');
                })
                .finally(() => {
                    item.done = true;

                    if (id === session.current) {
                        publish();
                    }
                });
        },
        [publish, release],
    );

    /**
     * The passage being read, so far: its text shows the words before the reader pauses. Skipped while
     * an earlier one is on its way, and dropped when the server is busy (only the final text counts).
     */
    const progress = useCallback((samples: Float32Array, number: number): boolean => {
        if (interimSent.current) {
            return false;
        }

        const id = session.current;
        const form = new FormData();

        interimSent.current = true;
        form.append('audio', new Blob([encodeWav(samples)], { type: 'audio/wav' }), 'recitation.wav');
        form.append('partial', '1');

        http.post<{ text: string }>(route('recitation.transcribe'), form)
            .then(({ data }) => {
                if (id === session.current && number > finished.current) {
                    interimOf.current = number;
                    setInterim(data.text ?? '');
                }
            })
            .catch(() => undefined)
            .finally(() => {
                interimSent.current = false;
            });

        return true;
    }, []);

    const voice = useRef<VoicePassages | null>(null);
    voice.current ??= new VoicePassages({ onPassage: send, onProgress: progress });

    const hear = useCallback((samples: Float32Array) => {
        if (keptLength.current < KEPT_S * RATE) {
            kept.current.push(samples);
            keptLength.current += samples.length;
        }

        voice.current?.push(samples);
    }, []);

    const clearRecording = useCallback(() => {
        kept.current = [];
        keptLength.current = 0;
        setRecording((current) => {
            if (current) {
                URL.revokeObjectURL(current);
            }

            return null;
        });
    }, []);

    const start = useCallback(() => {
        setError(null);

        if (!supported) {
            setError('unsupported');

            return;
        }

        if (!window.isSecureContext) {
            setError('insecure');

            return;
        }

        if (wanted.current) {
            return;
        }

        wanted.current = true;
        setListening(true);
        clearRecording();

        void (async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
                const context = new AudioContext();
                const module = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));

                try {
                    await context.audioWorklet.addModule(module);
                } finally {
                    URL.revokeObjectURL(module);
                }

                const source = context.createMediaStreamSource(stream);
                const node = new AudioWorkletNode(context, 'rattil-capture');
                const silent = context.createGain();
                const toRate = downsampler(context.sampleRate);

                silent.gain.value = 0;
                source.connect(node);
                node.connect(silent);
                silent.connect(context.destination);
                node.port.onmessage = (event: MessageEvent<Float32Array>) => hear(toRate(event.data));
                capture.current = { stream, context, node };

                if (context.state === 'suspended') {
                    await context.resume();
                }

                // Stopped while the microphone was being opened.
                if (!wanted.current) {
                    release();
                }
            } catch (exception) {
                wanted.current = false;
                release();
                setListening(false);
                setError(
                    exception instanceof DOMException && (exception.name === 'NotAllowedError' || exception.name === 'SecurityError')
                        ? 'denied'
                        : exception instanceof DOMException && exception.name === 'NotFoundError'
                          ? 'no-microphone'
                          : 'failed',
                );
            }
        })();
    }, [supported, clearRecording, hear, release]);

    const stop = useCallback(() => {
        if (!wanted.current) {
            return;
        }

        wanted.current = false;
        voice.current?.end();
        voice.current?.clear();
        release();
        setListening(false);

        if (keptLength.current > 0) {
            const url = URL.createObjectURL(new Blob([encodeWav(concat(kept.current))], { type: 'audio/wav' }));
            kept.current = [];
            keptLength.current = 0;
            setRecording((current) => {
                if (current) {
                    URL.revokeObjectURL(current);
                }

                return url;
            });
        }
    }, [release]);

    const reset = useCallback(() => {
        session.current++;
        passages.current = [];
        finished.current = -1;
        interimOf.current = -1;
        voice.current?.clear();
        setFinal('');
        setInterim('');
        setBusy(false);
        setError(null);
        clearRecording();
    }, [clearRecording]);

    useEffect(
        () => () => {
            wanted.current = false;
            session.current++;
            release();
        },
        [release],
    );

    return { supported, listening, busy, transcript: `${final} ${interim}`.trim(), final, interim, error, start, stop, reset, recording };
}
