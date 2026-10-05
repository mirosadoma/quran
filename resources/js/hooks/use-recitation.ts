import { useCallback, useEffect, useRef, useState } from 'react';
import { readPreference, writePreference } from '@/lib/mushaf';
import { ayahCount, ayahFromId, ayahId, surahName } from '@/lib/quran';
import type { MushafAyah, ReciterItem } from '@/types';

/**
 * One file to play: an ayah, or the basmala said before the first ayah of a surah.
 */
export interface RecitationItem {
    id: number;
    surah: number;
    ayah: number;
    basmala?: boolean;
}

export interface RecitationOptions {
    /** Times each ayah is recited (to memorize it). */
    repeatAyah: number;
    /** Times the whole selection is recited. */
    repeatAll: number;
    rate: number;
}

interface RecitationState {
    queue: RecitationItem[];
    index: number;
    label: string;
    playing: boolean;
    loading: boolean;
    failed: boolean;
}

const idle: RecitationState = { queue: [], index: 0, label: '', playing: false, loading: false, failed: false };

const pad = (value: number) => String(value).padStart(3, '0');

export function audioUrl(reciter: ReciterItem, item: RecitationItem): string {
    return item.basmala ? `${reciter.audio_url}001001.mp3` : `${reciter.audio_url}${pad(item.surah)}${pad(item.ayah)}.mp3`;
}

/**
 * Say the basmala before the first ayah of every surah except Al-Fatihah (where it is
 * the first ayah) and At-Tawbah.
 */
function withBasmala(items: RecitationItem[]): RecitationItem[] {
    return items.flatMap((item) => (item.ayah === 1 && item.surah !== 1 && item.surah !== 9 ? [{ ...item, basmala: true }, item] : [item]));
}

export function rangeQueue(fromSurah: number, fromAyah: number, toSurah: number, toAyah: number): RecitationItem[] {
    const first = ayahId(fromSurah, fromAyah);
    const last = ayahId(toSurah, toAyah);
    const items: RecitationItem[] = [];

    for (let id = first; id <= last; id++) {
        items.push({ id, ...ayahFromId(id) });
    }

    return withBasmala(items);
}

export function surahQueue(surah: number, fromAyah = 1): RecitationItem[] {
    return rangeQueue(surah, fromAyah, surah, ayahCount(surah));
}

export function ayahsQueue(ayahs: Pick<MushafAyah, 'id' | 'surah' | 'ayah'>[]): RecitationItem[] {
    return withBasmala(ayahs.map(({ id, surah, ayah }) => ({ id, surah, ayah })));
}

/**
 * Plays a list of ayahs with the chosen reciter, one file per ayah, with repetition
 * for memorization and the lock-screen controls of the phone. The options are remembered
 * on the device under preferenceKey.
 */
export function useRecitation(reciter: ReciterItem | null, preferenceKey = 'player') {
    const [state, setState] = useState<RecitationState>(idle);
    const [options, setOptionsState] = useState<RecitationOptions>(() => readPreference(preferenceKey, { repeatAyah: 1, repeatAll: 1, rate: 1 }));
    const audio = useRef<HTMLAudioElement | null>(null);
    const preloader = useRef<HTMLAudioElement | null>(null);
    const stateRef = useRef(state);
    const optionsRef = useRef(options);
    const reciterRef = useRef(reciter);
    const repeats = useRef({ ayah: 0, all: 0 });

    stateRef.current = state;
    optionsRef.current = options;
    reciterRef.current = reciter;

    const playIndex = useCallback((index: number) => {
        const element = audio.current;
        const current = reciterRef.current;
        const { queue } = stateRef.current;
        const item = queue[index];

        if (!element || !current || !item) {
            return;
        }

        setState((previous) => ({ ...previous, index, loading: true, failed: false }));
        element.src = audioUrl(current, item);
        element.playbackRate = optionsRef.current.rate;
        void element.play().catch(() => setState((previous) => ({ ...previous, playing: false, loading: false })));

        const next = queue[index + 1];

        if (next && preloader.current) {
            preloader.current.src = audioUrl(current, next);
        }
    }, []);

    const advance = useCallback(() => {
        const { queue, index } = stateRef.current;
        const { repeatAyah, repeatAll } = optionsRef.current;
        const item = queue[index];

        if (item && !item.basmala && repeats.current.ayah + 1 < repeatAyah) {
            repeats.current.ayah++;
            playIndex(index);

            return;
        }

        repeats.current.ayah = 0;

        if (index + 1 < queue.length) {
            playIndex(index + 1);

            return;
        }

        if (repeats.current.all + 1 < repeatAll) {
            repeats.current.all++;
            playIndex(0);

            return;
        }

        setState(idle);
    }, [playIndex]);

    useEffect(() => {
        const element = new Audio();
        element.preload = 'auto';
        preloader.current = new Audio();
        preloader.current.preload = 'auto';
        audio.current = element;

        const onPlaying = () => setState((previous) => ({ ...previous, playing: true, loading: false }));
        const onPause = () => setState((previous) => ({ ...previous, playing: false }));
        const onWaiting = () => setState((previous) => ({ ...previous, loading: true }));
        const onError = () => setState((previous) => (previous.queue.length ? { ...previous, playing: false, loading: false, failed: true } : previous));
        const onEnded = () => advance();

        element.addEventListener('playing', onPlaying);
        element.addEventListener('pause', onPause);
        element.addEventListener('waiting', onWaiting);
        element.addEventListener('error', onError);
        element.addEventListener('ended', onEnded);

        return () => {
            element.pause();
            element.removeAttribute('src');
            element.removeEventListener('playing', onPlaying);
            element.removeEventListener('pause', onPause);
            element.removeEventListener('waiting', onWaiting);
            element.removeEventListener('error', onError);
            element.removeEventListener('ended', onEnded);
        };
    }, [advance]);

    const play = useCallback(
        (queue: RecitationItem[], label: string) => {
            if (queue.length === 0) {
                return;
            }

            repeats.current = { ayah: 0, all: 0 };
            stateRef.current = { ...idle, queue, label };
            setState(stateRef.current);
            playIndex(0);
        },
        [playIndex],
    );

    const toggle = useCallback(() => {
        const element = audio.current;

        if (!element || stateRef.current.queue.length === 0) {
            return;
        }

        if (element.paused) {
            if (stateRef.current.failed) {
                playIndex(stateRef.current.index);
            } else {
                void element.play().catch(() => undefined);
            }
        } else {
            element.pause();
        }
    }, [playIndex]);

    const stop = useCallback(() => {
        audio.current?.pause();
        setState(idle);
    }, []);

    const skip = useCallback(
        (step: 1 | -1) => {
            const { queue, index } = stateRef.current;
            let target = index + step;

            // Going back skips the basmala so the previous ayah is heard.
            while (queue[target]?.basmala && step === -1) {
                target--;
            }

            if (target >= 0 && target < queue.length) {
                repeats.current.ayah = 0;
                playIndex(target);
            }
        },
        [playIndex],
    );

    const setOptions = useCallback((changes: Partial<RecitationOptions>) => {
        setOptionsState((previous) => {
            const next = { ...previous, ...changes };
            writePreference(preferenceKey, next);

            if (audio.current) {
                audio.current.playbackRate = next.rate;
            }

            return next;
        });
    }, [preferenceKey]);

    // A new reciter takes over from the current ayah.
    useEffect(() => {
        if (stateRef.current.queue.length > 0) {
            playIndex(stateRef.current.index);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reciter?.id]);

    const current = state.queue[state.index] ?? null;

    // Lock screen and headphone controls.
    useEffect(() => {
        if (!('mediaSession' in navigator) || !current || !reciter) {
            return;
        }

        navigator.mediaSession.metadata = new MediaMetadata({
            title: current.basmala ? `سورة ${surahName(current.surah, 'ar')}` : `سورة ${surahName(current.surah, 'ar')} - ${current.ayah}`,
            artist: reciter.name,
            album: state.label,
        });

        navigator.mediaSession.setActionHandler('play', toggle);
        navigator.mediaSession.setActionHandler('pause', toggle);
        navigator.mediaSession.setActionHandler('nexttrack', () => skip(1));
        navigator.mediaSession.setActionHandler('previoustrack', () => skip(-1));
    }, [current, reciter, state.label, toggle, skip]);

    return {
        ...state,
        current,
        active: state.queue.length > 0,
        options,
        play,
        toggle,
        stop,
        next: () => skip(1),
        previous: () => skip(-1),
        setOptions,
    };
}

export type Recitation = ReturnType<typeof useRecitation>;
