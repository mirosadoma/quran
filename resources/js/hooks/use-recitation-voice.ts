import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useServerTranscription } from '@/hooks/use-server-transcription';
import { type SpeechError, useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { readPreference, writePreference } from '@/lib/mushaf';
import { type ExpectedWord, followRecitation, type RecitationMistake, type RecitationProgress } from '@/lib/recitation-check';
import { playMistakeSound, prepareSounds } from '@/lib/sounds';

export interface RecitationVoice {
    supported: boolean;
    listening: boolean;
    /** Passages still being turned into text on the server. */
    busy: boolean;
    final: string;
    interim: string;
    /**
     * What the speech recognition of the browser heard, when it listens beside the server's (on
     * computers): the right words show at once, before the text of the server arrives to judge them.
     */
    fast: string;
    error: SpeechError | null;
    start: () => void;
    stop: () => void;
    reset: () => void;
    /** The vowels of what is heard are checked: the recognition of the server is used. */
    checksVowels: boolean;
    /** The server can check the vowels (its service is set up). */
    vowelCheckAvailable: boolean;
    /** The reader's choice to check the vowels. */
    vowelCheck: boolean;
    setVowelCheck: (value: boolean) => void;
    /** The reader's recording, to listen to it (with the recognition of the server). */
    recording: string | null;
}

const onPhone = () => typeof navigator !== 'undefined' && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

/**
 * The microphone for reciting: the speech recognition of the browser (words and letters, as the reader
 * goes), or the recognition of the server, which also hears the vowels (after each pause). The reader
 * chooses; browsers without speech recognition (Firefox) use the server. On computers the browser
 * listens beside the server, to show the right words at once (phones give the microphone to one only).
 */
export function useRecitationVoice(vowelCheckAvailable: boolean): RecitationVoice {
    const [vowelCheck, setVowelCheckState] = useState<boolean>(() => readPreference('recitation.vowels', true));
    const [phone] = useState(onPhone);
    const browser = useSpeechRecognition();
    const server = useServerTranscription();
    const useServer = vowelCheckAvailable && (vowelCheck || !browser.supported);
    const both = useServer && browser.supported && !phone;
    const active = useServer ? server : browser;
    const { start: startBrowser, stop: stopBrowser, reset: resetBrowser } = browser;
    const { start: startServer, stop: stopServer, reset: resetServer } = server;

    const start = useCallback(() => {
        if (useServer) {
            startServer();
        }

        if (!useServer || both) {
            startBrowser();
        }
    }, [useServer, both, startServer, startBrowser]);

    // Stopping or forgetting the one that does not listen does nothing.
    const stop = useCallback(() => {
        stopServer();
        stopBrowser();
    }, [stopServer, stopBrowser]);

    const reset = useCallback(() => {
        resetServer();
        resetBrowser();
    }, [resetServer, resetBrowser]);

    const setVowelCheck = useCallback(
        (value: boolean) => {
            stop();
            reset();
            setVowelCheckState(value);
            writePreference('recitation.vowels', value);
        },
        [stop, reset],
    );

    return {
        supported: active.supported,
        listening: active.listening,
        busy: useServer && server.busy,
        final: active.final,
        interim: active.interim,
        fast: both ? browser.transcript : '',
        error: active.error,
        start,
        stop,
        reset,
        checksVowels: useServer,
        vowelCheckAvailable,
        vowelCheck,
        setVowelCheck,
        recording: useServer ? server.recording : null,
    };
}

interface FollowSettings {
    /** The words to recite. */
    expected: ExpectedWord[];
    vowelCheckAvailable: boolean;
    /** The reader may start at any of the words (a page of the mushaf). */
    freeStart?: boolean;
    /** Score over all the words (one ayah for children). */
    whole?: boolean;
    /** Every new mistake, to keep it for the session. */
    onMistake: (mistake: RecitationMistake) => void;
}

/**
 * The recitation as shown: the words the browser already heard right are shown said, ahead of the text
 * of the server, which alone judges the mistakes (so nothing is shown past a mistake it found).
 */
function aheadWith(progress: RecitationProgress, quick: RecitationProgress | null): RecitationProgress {
    if (!quick || quick.start === null || progress.blocked || (progress.start !== null && quick.start !== progress.start)) {
        return progress;
    }

    const reached = Math.max(progress.reached, quick.cursor);

    return reached === progress.reached && progress.start !== null ? progress : { ...progress, start: progress.start ?? quick.start, reached };
}

/**
 * Listens to the reader and follows the recitation word by word (see followRecitation): each new
 * mistake is reported and announced with a short alert sound (unless the reader turned it off).
 */
export function useRecitationFollow({ expected, vowelCheckAvailable, freeStart = false, whole = false, onMistake }: FollowSettings) {
    const voice = useRecitationVoice(vowelCheckAvailable);
    const [prompts, setPrompts] = useState<number[]>([]);
    const [sound, setSoundState] = useState<boolean>(() => readPreference('recitation.sound', true));
    const progress = useMemo(
        () => followRecitation(expected, voice.final, voice.interim, { freeStart, whole, vowels: voice.checksVowels, prompts }),
        [expected, voice.final, voice.interim, freeStart, whole, voice.checksVowels, prompts],
    );
    const quick = useMemo(() => (voice.fast ? followRecitation(expected, voice.fast, '', { freeStart, whole }) : null), [expected, voice.fast, freeStart, whole]);
    const shown = useMemo(() => aheadWith(progress, quick), [progress, quick]);
    const reported = useRef({ expected, count: 0 });
    const onMistakeRef = useRef(onMistake);
    const soundRef = useRef(sound);
    const { reset, start } = voice;

    onMistakeRef.current = onMistake;
    soundRef.current = sound;

    useEffect(() => {
        // Other words to recite: what was heard belonged to the words before.
        if (reported.current.expected !== expected) {
            reported.current = { expected, count: 0 };

            return;
        }

        // Fewer mistakes than before: the recitation started over (the mistakes only grow while it goes on).
        if (progress.mistakes.length < reported.current.count) {
            reported.current.count = 0;
        }

        const fresh = progress.mistakes.slice(reported.current.count);
        reported.current.count = progress.mistakes.length;
        fresh.forEach((mistake) => onMistakeRef.current(mistake));

        if (soundRef.current && fresh.some((mistake) => mistake.kind !== 'helped')) {
            playMistakeSound();
        }
    }, [expected, progress.mistakes]);

    /** Start the recitation over (what was heard is forgotten; the mistakes kept stay). */
    const restart = useCallback(() => {
        reported.current = { expected, count: 0 };
        setPrompts([]);
        reset();
    }, [expected, reset]);

    // Other words to recite (the page was turned): start over on them.
    const firstWords = useRef(true);

    useEffect(() => {
        if (firstWords.current) {
            firstWords.current = false;

            return;
        }

        setPrompts([]);
        reset();
    }, [expected, reset]);

    const begin = useCallback(() => {
        prepareSounds();
        start();
    }, [start]);

    /** Say the word for the reader (counted as a mistake) and go on. */
    const prompt = useCallback(() => setPrompts((list) => [...list, progress.said]), [progress.said]);

    const setSound = useCallback((value: boolean) => {
        setSoundState(value);
        writePreference('recitation.sound', value);
    }, []);

    return { voice, progress: shown, begin, restart, prompt, sound, setSound };
}
