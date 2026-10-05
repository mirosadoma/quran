import { ArrowRight, ChevronLeft, ChevronRight, EyeOff, Headphones, LoaderCircle, Pause, Repeat, RotateCcw, Snail } from 'lucide-react';
import { Fragment, type ReactNode, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AyahMarker } from '@/components/mushaf/mushaf-page';
import { HeardText, MicButton, RecitationLimitsNote, ScoreRing, scoreStars, SpeechErrorNotice, Stars, wordStatusClasses } from '@/components/recitation/recitation-ui';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/form';
import { rangeQueue, useRecitation } from '@/hooks/use-recitation';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { hasLetters } from '@/lib/arabic';
import { http } from '@/lib/http';
import { useTrans } from '@/lib/i18n';
import { type KidsProgress, saveScore } from '@/lib/kids';
import { readPreference, writePreference } from '@/lib/mushaf';
import { arabicDigits, surahName } from '@/lib/quran';
import { checkRecitation, expectedWords, statusByWord } from '@/lib/recitation-check';
import { cn } from '@/lib/utils';
import type { ReciterItem, SurahAyah } from '@/types';

const BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

const repeatChoices = [1, 3, 5, 10];

interface LessonProps {
    surah: number;
    reciters: ReciterItem[];
    progress: KidsProgress;
    onProgress: (progress: KidsProgress) => void;
    onBack: () => void;
}

/**
 * One surah, ayah by ayah: listen to the sheikh (with repetition), then recite with the voice and see
 * the words and letters read right or wrong, with a score and stars.
 */
export function Lesson({ surah, reciters, progress, onProgress, onBack }: LessonProps) {
    const { t, locale } = useTrans();
    const [ayahs, setAyahs] = useState<SurahAyah[] | null>(null);
    const [failed, setFailed] = useState(false);
    const [index, setIndex] = useState(0);
    const [hide, setHide] = useState(false);
    const [yourTurn, setYourTurn] = useState(false);
    const [reciterId, setReciterId] = useState<number | null>(() => readPreference('kids.reciter', reciters[0]?.id ?? null));
    const reciter = reciters.find((item) => item.id === reciterId) ?? reciters[0] ?? null;
    const recitation = useRecitation(reciter, 'kids.player');
    const speech = useSpeechRecognition();
    const recorder = useVoiceRecorder();
    const transcript = useDeferredValue(speech.transcript);
    const wasPlaying = useRef(false);
    const saved = useRef('');

    useEffect(() => {
        let active = true;
        setAyahs(null);
        setFailed(false);
        setIndex(0);

        http.get<{ ayahs: SurahAyah[] }>(route('mushaf.surah', surah))
            .then(({ data }) => active && setAyahs(data.ayahs))
            .catch(() => active && setFailed(true));

        return () => {
            active = false;
        };
    }, [surah]);

    const ayah = ayahs?.[index] ?? null;
    const expected = useMemo(() => (ayah ? expectedWords([ayah]) : []), [ayah]);
    const check = useMemo(() => checkRecitation(expected, transcript, { partial: speech.listening }), [expected, transcript, speech.listening]);
    const statuses = ayah && transcript ? statusByWord(check.words).get(ayah.id) : undefined;
    const finished = !speech.listening && transcript !== '';
    const playing = recitation.active && recitation.playing;

    // Keep the best score of the ayah once a recitation ends.
    useEffect(() => {
        const key = `${ayah?.id}:${transcript}`;

        if (finished && ayah && saved.current !== key) {
            saved.current = key;
            onProgress(saveScore(progress, surah, ayah.ayah, check.score));
        }
    }, [finished, ayah, transcript, check.score, progress, surah, onProgress]);

    // The sheikh finished: the child's turn.
    useEffect(() => {
        if (wasPlaying.current && !recitation.active) {
            setYourTurn(true);
        }

        wasPlaying.current = recitation.active;
    }, [recitation.active]);

    const { stop: stopSpeech, reset: resetSpeech } = speech;
    const { stop: stopAudio } = recitation;
    const { stop: stopRecorder, clear: clearRecorder } = recorder;

    const goTo = useCallback(
        (target: number) => {
            stopSpeech();
            resetSpeech();
            stopRecorder();
            clearRecorder();
            stopAudio();
            setYourTurn(false);
            setIndex(target);
        },
        [stopSpeech, resetSpeech, stopRecorder, clearRecorder, stopAudio],
    );

    const count = ayahs?.length ?? 0;

    // Arrows: in Arabic the next ayah is on the left.
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if ((event.target as HTMLElement).closest('input, textarea, select')) {
                return;
            }

            if (event.key === 'ArrowLeft' && index + 1 < count) {
                goTo(index + 1);
            } else if (event.key === 'ArrowRight' && index > 0) {
                goTo(index - 1);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [goTo, index, count]);

    const listen = () => {
        if (!ayah) {
            return;
        }

        if (recitation.active) {
            recitation.stop();

            return;
        }

        if (speech.listening) {
            speech.stop();
            recorder.stop();
        }

        setYourTurn(false);
        recitation.play(rangeQueue(surah, ayah.ayah, surah, ayah.ayah), `${surahName(surah, 'ar')} ${ayah.ayah}`);
    };

    const toggleMic = () => {
        if (speech.listening) {
            speech.stop();
            recorder.stop();

            return;
        }

        recitation.stop();
        setYourTurn(false);
        speech.reset();
        recorder.clear();
        speech.start();
        void recorder.start();
    };

    const chooseReciter = (item: ReciterItem) => {
        setReciterId(item.id);
        writePreference('kids.reciter', item.id);
    };

    const number = (value: number) => (locale === 'ar' ? arabicDigits(value) : String(value));

    if (failed) {
        return (
            <div className="rounded-3xl border border-line bg-surface p-8 text-center">
                <p className="text-ink">{t('Something went wrong, please try again.')}</p>
                <Button variant="secondary" className="mt-4" onClick={onBack}>
                    <ArrowRight className="ltr:rotate-180" />
                    {t('Back to the surahs')}
                </Button>
            </div>
        );
    }

    if (!ayahs || !ayah) {
        return (
            <div className="flex h-80 items-center justify-center rounded-3xl border border-line bg-surface">
                <LoaderCircle className="size-8 animate-spin text-primary-600" />
            </div>
        );
    }

    const words = ayah.text.split(' ');
    const size = words.length > 40 ? 'text-2xl sm:text-3xl' : words.length > 18 ? 'text-3xl sm:text-4xl' : 'text-4xl sm:text-5xl';
    let previousHidden = false;
    const best = progress[surah]?.[ayah.ayah];

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
                <Button variant="secondary" size="sm" onClick={onBack}>
                    <ArrowRight className="ltr:rotate-180" />
                    {t('Surahs')}
                </Button>
                <div className="min-w-0 flex-1">
                    <h1 className="font-quran text-2xl leading-tight font-bold text-ink">{`${t('Surah')} ${surahName(surah, 'ar')}`}</h1>
                    <p className="text-xs text-muted">{t('Ayah :number of :count', { number: number(ayah.ayah), count: number(count) })}</p>
                </div>
                {best !== undefined && (
                    <span className="flex items-center gap-2 rounded-full bg-gold-50 px-3 py-1 text-sm text-gold-700 dark:bg-gold-500/10 dark:text-gold-300">
                        <Stars count={scoreStars(best)} />
                        <span className="text-xs font-semibold">{t('Best: :score%', { score: number(best) })}</span>
                    </span>
                )}
            </div>

            <AyahProgress count={count} index={index} surah={surah} progress={progress} onPick={goTo} />

            <div
                className={cn(
                    'relative overflow-hidden rounded-[2rem] border-2 bg-surface px-5 py-8 text-center shadow-sm transition sm:px-10 sm:py-10',
                    playing ? 'border-primary-400 ring-8 ring-primary-500/10' : 'border-line',
                )}
                style={{ '--paper-ink': 'var(--color-ink)' } as CSSProperties}
            >
                {ayah.ayah === 1 && surah !== 1 && surah !== 9 && <p className="mb-4 font-quran text-xl text-muted sm:text-2xl">{BASMALA}</p>}
                <p dir="rtl" className={cn('font-quran leading-[2.15] text-ink', size)}>
                    {words.map((word, position) => {
                        const status = statuses?.get(position);
                        const hidden = hide && (hasLetters(word) ? status === undefined || status === 'pending' : previousHidden);
                        previousHidden = hidden;

                        return (
                            <Fragment key={position}>
                                <span className={cn('rounded-lg transition-colors duration-300', status && wordStatusClasses[status], hidden && 'mushaf-hidden')}>{word}</span>{' '}
                            </Fragment>
                        );
                    })}
                    <span className="inline-block text-[0.8em]">
                        <AyahMarker number={ayah.ayah} />
                    </span>
                </p>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
                <Panel title={t('Listen to the sheikh')} icon={Headphones}>
                    <Button size="lg" className="w-full" onClick={listen} variant={recitation.active ? 'secondary' : 'primary'}>
                        {recitation.active ? <Pause /> : <Headphones />}
                        {recitation.active ? t('Stop listening') : t('Listen to the ayah')}
                    </Button>

                    <div className="mt-4">
                        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
                            <Repeat className="size-3.5" />
                            {t('Repeat the ayah')}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {repeatChoices.map((times) => (
                                <button
                                    key={times}
                                    type="button"
                                    onClick={() => recitation.setOptions({ repeatAyah: times })}
                                    className={cn(
                                        'min-w-12 rounded-xl px-3 py-2 text-sm font-bold transition',
                                        recitation.options.repeatAyah === times ? 'bg-primary-700 text-white shadow-sm' : 'bg-surface-muted text-ink hover:bg-line',
                                    )}
                                >
                                    {times === 1 ? t('Once') : `× ${number(times)}`}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => recitation.setOptions({ rate: recitation.options.rate < 1 ? 1 : 0.8 })}
                                className={cn(
                                    'flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition',
                                    recitation.options.rate < 1 ? 'bg-gold-500 text-white shadow-sm' : 'bg-surface-muted text-ink hover:bg-line',
                                )}
                                aria-pressed={recitation.options.rate < 1}
                            >
                                <Snail className="size-4" />
                                {t('Slower')}
                            </button>
                        </div>
                    </div>

                    {reciters.length > 1 && (
                        <div className="mt-4">
                            <p className="mb-2 text-xs font-semibold text-muted">{t('Choose the sheikh')}</p>
                            <div className="flex flex-wrap gap-2">
                                {reciters.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => chooseReciter(item)}
                                        className={cn(
                                            'flex items-center gap-2 rounded-2xl border px-2.5 py-1.5 text-sm font-semibold transition',
                                            reciter?.id === item.id ? 'border-primary-500 bg-primary-50 text-primary-800 dark:bg-primary-500/10 dark:text-primary-200' : 'border-line text-ink hover:border-line-strong',
                                        )}
                                    >
                                        <Avatar name={item.name} size="xs" />
                                        {item.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </Panel>

                <Panel title={t('Recite with your voice')} icon={RotateCcw} hideIcon>
                    {speech.error ? (
                        <SpeechErrorNotice error={speech.error} />
                    ) : (
                        <div className="flex items-center gap-4">
                            <MicButton listening={speech.listening} onClick={toggleMic} className={cn(yourTurn && !speech.listening && 'animate-bounce')} />
                            <div className="min-w-0 flex-1">
                                <p className="font-bold text-ink">
                                    {speech.listening ? t('Listening… recite the ayah') : yourTurn ? t('Your turn! Recite the ayah') : t('Press the microphone and recite the ayah')}
                                </p>
                                <p className="mt-0.5 text-xs leading-relaxed text-muted">{t('Press again when you finish.')}</p>
                            </div>
                        </div>
                    )}

                    <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-ink">
                        <Switch checked={hide} onChange={setHide} />
                        <EyeOff className="size-4 text-muted" />
                        {t('Hide the ayah (recite from memory)')}
                    </label>

                    {transcript && (
                        <div className="mt-4 space-y-3">
                            {finished && <Result score={check.score} />}
                            <div className="rounded-2xl bg-surface-muted/70 px-4 py-2 ring-1 ring-line">
                                <p className="pt-1 text-xs font-semibold text-muted">{t('What you said')}</p>
                                <HeardText heard={check.heard} className="text-2xl" />
                            </div>
                            {finished && (
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="secondary" onClick={toggleMic}>
                                        <RotateCcw />
                                        {t('Recite again')}
                                    </Button>
                                    {index + 1 < count && (
                                        <Button onClick={() => goTo(index + 1)}>
                                            {t('Next ayah')}
                                            <ChevronLeft className="ltr:rotate-180" />
                                        </Button>
                                    )}
                                </div>
                            )}
                            {recorder.url && !speech.listening && (
                                <div>
                                    <p className="mb-1 text-xs font-semibold text-muted">{t('Listen to your recording')}</p>
                                    <audio controls src={recorder.url} className="h-10 w-full" />
                                </div>
                            )}
                        </div>
                    )}

                    <RecitationLimitsNote className="mt-4" />
                </Panel>
            </div>

            <div className="flex items-center justify-between gap-3">
                <Button variant="secondary" disabled={index === 0} onClick={() => goTo(index - 1)}>
                    <ChevronRight className="ltr:rotate-180" />
                    {t('Previous ayah')}
                </Button>
                <span className="text-sm font-semibold text-muted tabular-nums">
                    {number(index + 1)} / {number(count)}
                </span>
                <Button variant="secondary" disabled={index + 1 >= count} onClick={() => goTo(index + 1)}>
                    {t('Next ayah')}
                    <ChevronLeft className="ltr:rotate-180" />
                </Button>
            </div>
        </div>
    );
}

function Panel({ title, icon: Icon, hideIcon = false, children }: { title: string; icon: typeof Headphones; hideIcon?: boolean; children: ReactNode }) {
    return (
        <section className="rounded-3xl border border-line bg-surface p-5 shadow-xs">
            <h2 className="mb-4 flex items-center gap-2 font-bold text-ink">
                {!hideIcon && <Icon className="size-5 text-primary-600" />}
                {title}
            </h2>
            {children}
        </section>
    );
}

/**
 * The score of a finished recitation, with stars and a word of encouragement.
 */
function Result({ score }: { score: number }) {
    const { t } = useTrans();
    const stars = scoreStars(score);
    const message = [t('Let us listen to the sheikh and try again.'), t('Good! Try once more.'), t('Well done! Only a little left.'), t('Excellent! Masha Allah.')][stars];

    return (
        <div className="flex animate-fade-in items-center gap-4 rounded-2xl bg-linear-to-l from-gold-50 to-emerald-50 p-4 dark:from-gold-500/10 dark:to-emerald-500/10">
            <ScoreRing score={score} size={84} />
            <div className="min-w-0">
                <Stars count={stars} className="text-2xl" />
                <p className="mt-1 font-bold text-ink">{message}</p>
                <p className="text-xs text-muted">{t('Letters in red were read wrong; faded letters were left out.')}</p>
            </div>
        </div>
    );
}

/**
 * One dot per ayah (green once recited well), or a bar for long surahs.
 */
function AyahProgress({ count, index, surah, progress, onPick }: { count: number; index: number; surah: number; progress: KidsProgress; onPick: (index: number) => void }) {
    const { t } = useTrans();

    if (count > 40) {
        return (
            <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full rounded-full bg-primary-600 transition-all" style={{ width: `${(100 * (index + 1)) / count}%` }} />
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: count }, (_, position) => {
                const score = progress[surah]?.[position + 1];

                return (
                    <button
                        key={position}
                        type="button"
                        onClick={() => onPick(position)}
                        aria-label={t('Ayah :number', { number: position + 1 })}
                        className={cn(
                            'h-2.5 rounded-full transition-all',
                            position === index ? 'w-8 bg-primary-600' : 'w-2.5',
                            position !== index && (score === undefined ? 'bg-line-strong' : score >= 70 ? 'bg-emerald-500' : 'bg-gold-400'),
                        )}
                    />
                );
            })}
        </div>
    );
}

/**
 * Records the child's voice to play it back. Only on computers: phones give the microphone to
 * speech recognition alone.
 */
function useVoiceRecorder(): { url: string | null; start: () => Promise<void>; stop: () => void; clear: () => void } {
    const [url, setUrl] = useState<string | null>(null);
    const recorder = useRef<MediaRecorder | null>(null);
    const [enabled] = useState(
        () => typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && !/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent),
    );

    const stop = useCallback(() => {
        if (recorder.current?.state === 'recording') {
            recorder.current.stop();
        }
    }, []);

    const clear = useCallback(() => {
        setUrl((current) => {
            if (current) {
                URL.revokeObjectURL(current);
            }

            return null;
        });
    }, []);

    const start = useCallback(async () => {
        if (!enabled) {
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const instance = new MediaRecorder(stream);
            const chunks: Blob[] = [];

            instance.ondataavailable = (event) => chunks.push(event.data);
            instance.onstop = () => {
                stream.getTracks().forEach((track) => track.stop());
                setUrl(URL.createObjectURL(new Blob(chunks, { type: instance.mimeType })));
            };
            instance.start();
            recorder.current = instance;
        } catch {
            // No playback without the microphone; recognition still works.
        }
    }, [enabled]);

    useEffect(() => () => stop(), [stop]);

    return { url, start, stop, clear };
}
