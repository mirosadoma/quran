import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * unsupported = the browser has no speech recognition (Firefox), insecure = not opened over HTTPS,
 * denied = the microphone is blocked, network = the recognition service could not be reached.
 */
export type SpeechError = 'unsupported' | 'insecure' | 'denied' | 'no-microphone' | 'network' | 'language' | 'failed';

interface RecognitionResult {
    readonly isFinal: boolean;
    readonly 0: { readonly transcript: string };
}

interface RecognitionEvent {
    readonly results: ArrayLike<RecognitionResult>;
}

interface Recognition {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    onresult: ((event: RecognitionEvent) => void) | null;
    onerror: ((event: { error: string }) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
}

type RecognitionConstructor = new () => Recognition;

function recognitionClass(): RecognitionConstructor | null {
    const scope = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };

    return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
    return typeof window !== 'undefined' && recognitionClass() !== null;
}

const ERRORS: Record<string, SpeechError> = {
    'not-allowed': 'denied',
    'service-not-allowed': 'denied',
    'audio-capture': 'no-microphone',
    network: 'network',
    'language-not-supported': 'language',
};

/**
 * Speech to text in the browser (Chrome, Edge and Safari), for reciting from memory. Listening goes on
 * through the pauses of the reader until stop() is called.
 */
export function useSpeechRecognition(lang = 'ar-SA'): {
    supported: boolean;
    listening: boolean;
    transcript: string;
    error: SpeechError | null;
    start: () => void;
    stop: () => void;
    /** Forget what was heard; listening goes on if it was on. */
    reset: () => void;
} {
    const [listening, setListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<SpeechError | null>(null);
    const [supported] = useState(isSpeechRecognitionSupported);
    const recognition = useRef<Recognition | null>(null);
    const finished = useRef<string[]>([]);
    const wanted = useRef(false);
    const restarts = useRef(0);
    // Every recognition gets a number; events of an older one are ignored.
    const session = useRef(0);

    const begin = useCallback(() => {
        const Recognition = recognitionClass();

        if (!Recognition) {
            return;
        }

        const id = ++session.current;
        const instance = new Recognition();
        let heard = '';

        instance.lang = lang;
        instance.interimResults = true;
        // Android repeats earlier words in continuous mode: listen to one sentence at a time there.
        instance.continuous = !/android/i.test(navigator.userAgent);
        instance.maxAlternatives = 1;

        instance.onresult = (event) => {
            if (id !== session.current) {
                return;
            }

            let final = '';
            let interim = '';

            for (let index = 0; index < event.results.length; index++) {
                const result = event.results[index];

                if (result.isFinal) {
                    final += `${result[0].transcript} `;
                } else {
                    interim += `${result[0].transcript} `;
                }
            }

            heard = final.trim();
            restarts.current = 0;
            setTranscript([...finished.current, final, interim].join(' ').replace(/\s+/g, ' ').trim());
        };

        instance.onerror = (event) => {
            if (id !== session.current || event.error === 'no-speech' || event.error === 'aborted') {
                return;
            }

            wanted.current = false;
            setError(ERRORS[event.error] ?? 'failed');
        };

        instance.onend = () => {
            if (id !== session.current) {
                return;
            }

            if (heard) {
                finished.current.push(heard);
            }

            setTranscript(finished.current.join(' '));

            // The browser ends a recognition after a pause: go on listening until the reader stops.
            if (wanted.current && restarts.current < 30) {
                restarts.current++;
                window.setTimeout(() => wanted.current && id === session.current && begin(), 120);
            } else {
                wanted.current = false;
                recognition.current = null;
                setListening(false);
            }
        };

        recognition.current = instance;

        try {
            instance.start();
        } catch {
            wanted.current = false;
            recognition.current = null;
            setListening(false);
            setError('failed');
        }
    }, [lang]);

    const start = useCallback(() => {
        setError(null);

        if (!isSpeechRecognitionSupported()) {
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
        restarts.current = 0;
        setListening(true);
        begin();
    }, [begin]);

    const stop = useCallback(() => {
        wanted.current = false;
        recognition.current?.stop();
    }, []);

    const reset = useCallback(() => {
        // Whatever the current recognition still reports belongs to the words being forgotten.
        session.current++;
        recognition.current?.abort();
        recognition.current = null;
        finished.current = [];
        setTranscript('');
        setError(null);

        if (wanted.current) {
            window.setTimeout(() => wanted.current && begin(), 150);
        } else {
            setListening(false);
        }
    }, [begin]);

    useEffect(
        () => () => {
            wanted.current = false;
            session.current++;
            recognition.current?.abort();
        },
        [],
    );

    return { supported, listening, transcript, error, start, stop, reset };
}
