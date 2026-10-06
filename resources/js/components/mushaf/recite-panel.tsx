import { EyeOff, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import {
    BlockedNotice,
    MicButton,
    MistakeList,
    RecitationLimitsNote,
    RecitationOptions,
    RecitedText,
    ScoreRing,
    SpeechErrorNotice,
    VowelCheckBusy,
} from '@/components/recitation/recitation-ui';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/form';
import { useRecitationFollow } from '@/hooks/use-recitation-voice';
import { useTrans } from '@/lib/i18n';
import { type ExpectedWord, expectedWords, type RecitationMistake, type RecitationProgress, recitedWords } from '@/lib/recitation-check';
import { formatNumber } from '@/lib/utils';
import type { MushafAyah } from '@/types';

/**
 * Where the reader is in the words being recited.
 */
export interface ReciteState {
    expected: ExpectedWord[];
    progress: RecitationProgress;
}

interface RecitePanelProps {
    /** The ayahs to recite, from the chosen ayah to the end of the open pages. */
    ayahs: MushafAyah[];
    label: string;
    hideText: boolean;
    onHideText: (hide: boolean) => void;
    /** The server can check the vowels. */
    vowelCheck: boolean;
    /** The mistakes made since the page was opened. */
    mistakes: RecitationMistake[];
    onMistake: (mistake: RecitationMistake) => void;
    onClearMistakes: () => void;
    /** Where the reader is, to mark the words of the page (null before the reader starts). */
    onProgress: (state: ReciteState | null) => void;
    onClose: () => void;
}

/**
 * Recite from the mushaf with the voice, word by word like with a teacher: only the right words are
 * written; at a mistake an alert sounds, the recitation stops at that word (marked on the page) until
 * it is said right, and the mistake is kept in the list. "Recite again" starts over.
 */
export function RecitePanel({ ayahs, label, hideText, onHideText, vowelCheck, mistakes, onMistake, onClearMistakes, onProgress, onClose }: RecitePanelProps) {
    const { t, locale } = useTrans();
    const expected = useMemo(() => expectedWords(ayahs), [ayahs]);
    const { voice, progress, begin, restart, prompt, sound, setSound } = useRecitationFollow({ expected, vowelCheckAvailable: vowelCheck, freeStart: true, onMistake });
    const recited = useMemo(() => recitedWords(expected, progress).map((word) => word.written), [expected, progress]);
    const scroller = useRef<HTMLDivElement>(null);

    // Opened by a click: start listening right away (and again after turning the vowel check on or off).
    useEffect(() => {
        begin();
    }, [begin]);

    useEffect(() => {
        onProgress(progress.start === null ? null : { expected, progress });
    }, [expected, progress, onProgress]);

    useEffect(() => () => onProgress(null), [onProgress]);

    // Keep the last words said in view.
    useEffect(() => {
        const element = scroller.current;

        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    }, [recited.length]);

    const counts = useMemo(
        () => ({
            mistakes: progress.mistakes.filter((mistake) => mistake.kind !== 'helped').length,
            vowels: progress.mistakes.filter((mistake) => mistake.kind === 'vowel').length,
        }),
        [progress.mistakes],
    );

    const again = () => {
        restart();
        begin();
    };

    return (
        <div className="mushaf-dock fixed inset-x-0 bottom-0 z-30 animate-slide-up border-t border-line bg-surface/97 shadow-[0_-10px_30px_-15px_rgb(0_0_0/0.3)] backdrop-blur lg:start-72">
            <div className="mx-auto max-h-[70vh] max-w-4xl overflow-y-auto px-4 py-3">
                <div className="flex items-center gap-3">
                    <MicButton size="md" listening={voice.listening} onClick={voice.listening ? voice.stop : begin} />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-ink">{voice.listening ? t('Listening… recite from memory') : t('Recite with your voice')}</p>
                        {voice.busy ? <VowelCheckBusy /> : <p className="truncate text-xs text-muted">{label}</p>}
                    </div>
                    {progress.cursor > (progress.start ?? 0) && <ScoreRing score={progress.score} size={54} />}
                    <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t('Close')}>
                        <X />
                    </Button>
                </div>

                {voice.error ? (
                    <SpeechErrorNotice error={voice.error} className="mt-3" />
                ) : (
                    <>
                        {progress.blocked && <BlockedNotice mistake={progress.blocked} onPrompt={prompt} className="mt-3" />}
                        <div ref={scroller} className="mt-3 max-h-[20vh] overflow-y-auto rounded-2xl bg-surface-muted/70 px-4 py-1.5 ring-1 ring-line" aria-live="polite">
                            <RecitedText
                                words={recited}
                                placeholder={t('Start reciting: every right word is written here. At a mistake you hear an alert and the word is marked on the page.')}
                                className="text-xl"
                            />
                        </div>
                    </>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {t(':count right', { count: formatNumber(progress.right, locale) })}
                        </span>
                        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                            {t(':count mistakes', { count: formatNumber(counts.mistakes, locale) })}
                        </span>
                        {voice.checksVowels && (
                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                                {t(':count vowel mistakes', { count: formatNumber(counts.vowels, locale) })}
                            </span>
                        )}
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                        <Switch checked={hideText} onChange={onHideText} />
                        <EyeOff className="size-4 text-muted" />
                        {t('Hide the ayahs')}
                    </label>
                    <Button variant="secondary" size="sm" className="ms-auto" onClick={again}>
                        <RotateCcw />
                        {t('Recite again')}
                    </Button>
                </div>

                <RecitationOptions voice={voice} sound={sound} onSound={setSound} className="mt-3" />

                <MistakeList mistakes={mistakes} onClear={onClearMistakes} className="mt-3" />

                <RecitationLimitsNote vowels={voice.checksVowels} className="mt-2" />
            </div>
        </div>
    );
}
