import { usePage } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { readPreference, writePreference } from '@/lib/mushaf';
import type { SharedProps } from '@/types';

export interface ReadAloud {
    /** The texts can be read aloud (the voice of the server, or the speech synthesis of the browser). */
    supported: boolean;
    /** An Arabic voice is there to read (the server's, or one installed on the device). */
    hasVoice: boolean;
    /** A reading is under way (also while it is paused). */
    speaking: boolean;
    paused: boolean;
    /** Index of the segment being read. */
    current: number | null;
    rate: number;
    /** Change the speed (remembered on the device). */
    setRate: (rate: number) => void;
    /** Read the segments in order, from the given one. */
    speak: (segments: string[], from?: number) => void;
    pause: () => void;
    resume: () => void;
    stop: () => void;
}

interface Piece {
    /** Index of the caller's segment the piece belongs to. */
    segment: number;
    text: string;
}

/**
 * Chrome stops reading an utterance after about fifteen seconds, so texts are read in pieces of
 * at most this many characters: their sentences, and the long ones cut at a comma or between words.
 * The voice of the server reads the same pieces (each is made once and kept).
 */
const MAX_PIECE = 220;

/** Pieces loaded ahead from the server, so the voice goes on without a gap. */
const AHEAD = 2;

const RATE_PREFERENCE = 'readAloud.rate';

/**
 * The reader speaking now: one that starts reading takes the voice from the others.
 */
let activeReader: { id: symbol; halt: () => void } | null = null;

function synthesisSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
}

function languageOf(voice: SpeechSynthesisVoice): string {
    return voice.lang.replace('_', '-').toLowerCase();
}

/** Arabic voices of men on Apple, Microsoft (Edge and Windows) and Google devices. */
const MEN = /\b(maged|majed|tarik|hamed|shakir|naayf|bassel|fahed|hamdan|ali|ismael|jamal|laith|moaz|omar|rami|saleh|taim|hedi|abdullah|male)\b/i;

/**
 * The Arabic voice to read with: a man's voice first, then Saudi, Egyptian, any Arabic voice (the
 * natural ones first).
 */
function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    const rank = (voice: SpeechSynthesisVoice): number => {
        const language = languageOf(voice);
        const region = language.startsWith('ar-sa') ? 0 : language.startsWith('ar-eg') ? 1 : 2;

        return (MEN.test(voice.name) ? 0 : 10) + region * 2 + (/natural|neural|premium|enhanced/i.test(voice.name) ? 0 : 1);
    };

    return voices.filter((voice) => /^ar(-|$)/.test(languageOf(voice))).sort((first, second) => rank(first) - rank(second))[0] ?? null;
}

/**
 * What the voice says of a text: never the Quran quoted between ornate brackets (a voice would
 * mispronounce it), and the honorifics written as one sign spelled out.
 */
function speakable(text: string): string {
    return text
        .replace(/[﴾﴿][^﴾﴿]*[﴾﴿]/g, ' ')
        .replace(/ﷺ/g, ' صلى الله عليه وسلم ')
        .replace(/ﷻ/g, ' جل جلاله ')
        .replace(/﷽/g, ' بسم الله الرحمن الرحيم ')
        .replace(/ـ/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function cut(sentence: string): string[] {
    const pieces: string[] = [];
    let rest = sentence;

    while (rest.length > MAX_PIECE) {
        const head = rest.slice(0, MAX_PIECE);
        let end = Math.max(head.lastIndexOf('،'), head.lastIndexOf(','), head.lastIndexOf(':'));

        if (end < MAX_PIECE / 3) {
            end = head.lastIndexOf(' ');
        }

        if (end < MAX_PIECE / 3) {
            end = MAX_PIECE - 1;
        }

        pieces.push(rest.slice(0, end + 1).trim());
        rest = rest.slice(end + 1).trim();
    }

    return rest ? [...pieces, rest] : pieces;
}

/**
 * A text cut into pieces short enough to be read in one go.
 */
function piecesOf(text: string): string[] {
    const sentences = speakable(text).match(/[^.!?؟…؛]+(?:[.!?؟…؛]+["'»”)\]]*|$)/g) ?? [];

    return sentences.flatMap((sentence) => cut(sentence.trim())).filter((piece) => /[\p{L}\p{N}]/u.test(piece));
}

/**
 * Reads texts aloud in Arabic, one segment after the other, telling which segment is being read:
 * with the man's voice of the server when the platform has it (the same voice on every device),
 * otherwise with the voice of the device (a man's voice when there is one). Pausing stops the voice
 * and resuming starts again from the piece that was interrupted. The speed is remembered on the
 * device, and the reading stops when the component unmounts, when the page is left, or when another
 * reader starts.
 */
export function useReadAloud(): ReadAloud {
    const { narrator } = usePage<SharedProps>().props;
    // The voice of the server failed once: the device reads instead, until the page is reloaded.
    const [serverFailed, setServerFailed] = useState(false);
    const fromServer = !!narrator && !serverFailed;
    const [synthesis] = useState(synthesisSupported);
    const [id] = useState(() => Symbol('reader'));
    const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);
    const [speaking, setSpeaking] = useState(false);
    const [paused, setPaused] = useState(false);
    const [current, setCurrent] = useState<number | null>(null);
    const [rate, setRateState] = useState<number>(() => readPreference(RATE_PREFERENCE, 1));
    const pieces = useRef<Piece[]>([]);
    const position = useRef(0);
    // Bumped whenever the voice is stopped, so the events of the cancelled pieces are ignored.
    const generation = useRef(0);
    // Chrome never ends an utterance that was garbage collected: keep the one being read.
    const utterance = useRef<SpeechSynthesisUtterance | null>(null);
    const audio = useRef<HTMLAudioElement | null>(null);
    const loaded = useRef(new Map<number, HTMLAudioElement>());
    const timer = useRef<number | undefined>(undefined);
    const reading = useRef({ speaking: false, paused: false });
    const voiceRef = useRef(voice);
    const rateRef = useRef(rate);
    const fromServerRef = useRef(fromServer);

    voiceRef.current = voice;
    fromServerRef.current = fromServer;

    useEffect(() => {
        if (!synthesis) {
            return;
        }

        const synth = window.speechSynthesis;
        const load = () => setVoice(pickVoice(synth.getVoices()));

        // The voices often load a moment after the page.
        load();

        if (typeof synth.addEventListener === 'function') {
            synth.addEventListener('voiceschanged', load);

            return () => synth.removeEventListener('voiceschanged', load);
        }

        synth.onvoiceschanged = load;

        return () => {
            synth.onvoiceschanged = null;
        };
    }, [synthesis]);

    /** Stop the pieces of the server, and forget the ones loaded ahead. */
    const silenceAudio = useCallback(() => {
        audio.current?.pause();
        audio.current = null;
        loaded.current.forEach((element) => {
            element.pause();
            element.removeAttribute('src');
        });
        loaded.current.clear();
    }, []);

    /**
     * Forget the reading (without silencing the synthesis: the caller does it, or another reader took it).
     */
    const reset = useCallback(() => {
        generation.current++;
        window.clearTimeout(timer.current);
        utterance.current = null;
        silenceAudio();
        pieces.current = [];
        position.current = 0;
        reading.current = { speaking: false, paused: false };
        setSpeaking(false);
        setPaused(false);
        setCurrent(null);

        if (activeReader?.id === id) {
            activeReader = null;
        }
    }, [id, silenceAudio]);

    const say = useRef<(index: number) => void>(() => undefined);

    /** A piece read by the speech synthesis of the device. */
    const sayWithDevice = useCallback(
        (index: number) => {
            const piece = pieces.current[index];
            const synth = window.speechSynthesis;
            const token = generation.current;
            const spoken = new SpeechSynthesisUtterance(piece.text);
            const chosen = voiceRef.current;

            spoken.lang = chosen ? chosen.lang.replace('_', '-') : 'ar-SA';
            spoken.rate = rateRef.current;

            if (chosen) {
                spoken.voice = chosen;
            }

            spoken.onend = () => {
                if (token === generation.current) {
                    say.current(index + 1);
                }
            };

            spoken.onerror = (event) => {
                if (token !== generation.current) {
                    return;
                }

                // Stopped by someone else, or not allowed (iOS speaks only after a tap): the reading ends.
                if (event.error === 'interrupted' || event.error === 'canceled' || event.error === 'not-allowed') {
                    reset();

                    return;
                }

                say.current(index + 1);
            };

            utterance.current = spoken;

            if (synth.paused) {
                synth.resume();
            }

            synth.speak(spoken);
        },
        [reset],
    );

    /** The audio of a piece from the server (loaded ahead when it is coming next). */
    const audioOf = useCallback((index: number): HTMLAudioElement | null => {
        const piece = pieces.current[index];

        if (!piece) {
            return null;
        }

        let element = loaded.current.get(index);

        if (!element) {
            element = new Audio(route('speech', { text: piece.text }));
            element.preload = 'auto';
            loaded.current.set(index, element);
        }

        return element;
    }, []);

    /** A piece read by the man's voice of the server. */
    const sayWithServer = useCallback(
        (index: number) => {
            const token = generation.current;
            const element = audioOf(index);

            if (!element) {
                return;
            }

            loaded.current.delete(index);
            audio.current = element;
            element.playbackRate = rateRef.current;
            element.onended = () => {
                if (token === generation.current) {
                    say.current(index + 1);
                }
            };

            const fail = () => {
                if (token !== generation.current) {
                    return;
                }

                // The voice of the server failed: the device reads on from this piece.
                fromServerRef.current = false;
                setServerFailed(true);
                silenceAudio();

                if (synthesis) {
                    sayWithDevice(index);
                } else {
                    reset();
                }
            };

            element.onerror = fail;
            void element.play().catch((error: unknown) => {
                // Paused or stopped before it started: nothing to do.
                if (!(error instanceof DOMException && error.name === 'AbortError')) {
                    fail();
                }
            });

            for (let next = index + 1; next <= index + AHEAD; next++) {
                audioOf(next);
            }
        },
        [audioOf, reset, sayWithDevice, silenceAudio, synthesis],
    );

    say.current = (index: number) => {
        const piece = pieces.current[index];

        if (!piece) {
            reset();

            return;
        }

        position.current = index;
        setCurrent(piece.segment);

        if (fromServerRef.current) {
            sayWithServer(index);
        } else {
            sayWithDevice(index);
        }
    };

    /**
     * Read from a piece, once the voice has stopped what it was saying.
     */
    const start = useCallback(
        (index: number) => {
            generation.current++;
            window.clearTimeout(timer.current);

            if (activeReader && activeReader.id !== id) {
                activeReader.halt();
            }

            activeReader = { id, halt: reset };
            reading.current = { speaking: true, paused: false };
            setSpeaking(true);
            setPaused(false);
            setCurrent(pieces.current[index]?.segment ?? null);
            audio.current?.pause();

            if (fromServerRef.current || !synthesis) {
                say.current(index);

                return;
            }

            const synth = window.speechSynthesis;

            if (!synth.speaking && !synth.pending) {
                say.current(index);

                return;
            }

            synth.cancel();

            // Chrome drops an utterance spoken right after cancel(): give it a moment.
            const token = generation.current;
            timer.current = window.setTimeout(() => {
                if (token === generation.current) {
                    say.current(index);
                }
            }, 80);
        },
        [id, reset, synthesis],
    );

    const stop = useCallback(() => {
        if (!reading.current.speaking) {
            return;
        }

        reset();

        if (synthesis) {
            window.speechSynthesis.cancel();
        }
    }, [reset, synthesis]);

    const pause = useCallback(() => {
        if (!reading.current.speaking || reading.current.paused) {
            return;
        }

        reading.current = { speaking: true, paused: true };
        setPaused(true);

        if (audio.current) {
            audio.current.pause();

            return;
        }

        generation.current++;
        window.clearTimeout(timer.current);

        if (synthesis) {
            window.speechSynthesis.cancel();
        }
    }, [synthesis]);

    const resume = useCallback(() => {
        if (!reading.current.paused) {
            return;
        }

        // The audio of the server goes on where it stopped; the synthesis starts the piece again.
        if (audio.current) {
            reading.current = { speaking: true, paused: false };
            setPaused(false);
            void audio.current.play().catch(() => start(position.current));

            return;
        }

        start(position.current);
    }, [start]);

    const speak = useCallback(
        (segments: string[], from = 0) => {
            if (!fromServerRef.current && !synthesis) {
                return;
            }

            const all = segments.flatMap((text, segment) => piecesOf(text).map((piece) => ({ segment, text: piece })));
            const index = all.findIndex((piece) => piece.segment >= from);

            if (index === -1) {
                stop();

                return;
            }

            silenceAudio();
            pieces.current = all;
            start(index);
        },
        [synthesis, start, stop, silenceAudio],
    );

    const setRate = useCallback(
        (value: number) => {
            rateRef.current = value;
            setRateState(value);
            writePreference(RATE_PREFERENCE, value);

            // The audio of the server changes speed at once; the synthesis from the sentence being read.
            if (audio.current) {
                audio.current.playbackRate = value;
            } else if (reading.current.speaking && !reading.current.paused) {
                start(position.current);
            }
        },
        [start],
    );

    useEffect(() => {
        // Chrome goes on speaking after the page is left or reloaded.
        window.addEventListener('pagehide', stop);

        return () => {
            window.removeEventListener('pagehide', stop);
            stop();
        };
    }, [stop]);

    return {
        supported: fromServer || synthesis,
        hasVoice: fromServer || voice !== null,
        speaking,
        paused,
        current,
        rate,
        setRate,
        speak,
        pause,
        resume,
        stop,
    };
}
