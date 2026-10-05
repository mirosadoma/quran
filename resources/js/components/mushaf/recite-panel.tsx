import { EyeOff, RotateCcw, X } from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef } from 'react';
import { HeardText, MicButton, RecitationLimitsNote, ScoreRing, SpeechErrorNotice } from '@/components/recitation/recitation-ui';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/form';
import { useSpeechRecognition } from '@/hooks/use-speech-recognition';
import { useTrans } from '@/lib/i18n';
import { checkRecitation, expectedWords, type RecitationCheck } from '@/lib/recitation-check';
import { formatNumber } from '@/lib/utils';
import type { MushafAyah } from '@/types';

interface RecitePanelProps {
    /** The ayahs to recite, from the chosen ayah to the end of the open pages. */
    ayahs: MushafAyah[];
    label: string;
    hideText: boolean;
    onHideText: (hide: boolean) => void;
    /** The check of what was heard so far, to color the words of the page (null when nothing yet). */
    onResult: (check: RecitationCheck | null) => void;
    onClose: () => void;
}

/**
 * Recite from the mushaf with the voice: what the reader says is written as they go, and the
 * forgotten, wrong and mispronounced words are marked on the page. "Recite again" starts over.
 */
export function RecitePanel({ ayahs, label, hideText, onHideText, onResult, onClose }: RecitePanelProps) {
    const { t, locale } = useTrans();
    const speech = useSpeechRecognition();
    const { start, reset } = speech;
    const transcript = useDeferredValue(speech.transcript);
    const expected = useMemo(() => expectedWords(ayahs), [ayahs]);
    const check = useMemo(() => checkRecitation(expected, transcript, { freeStart: true, partial: true }), [expected, transcript]);
    const firstScope = useRef(true);

    // Opened by a click: start listening right away.
    useEffect(() => {
        start();
    }, [start]);

    // Other pages were opened: start over on them.
    useEffect(() => {
        if (firstScope.current) {
            firstScope.current = false;

            return;
        }

        reset();
    }, [expected, reset]);

    useEffect(() => {
        onResult(transcript ? check : null);
    }, [check, transcript, onResult]);

    useEffect(() => () => onResult(null), [onResult]);

    const counts = useMemo(() => {
        const reached = check.words.filter((word) => word.status !== 'pending');

        return {
            correct: reached.filter((word) => word.status === 'correct').length,
            mistakes: reached.filter((word) => word.status === 'close' || word.status === 'wrong').length,
            missing: reached.filter((word) => word.status === 'missing').length,
        };
    }, [check]);

    const again = () => {
        reset();
        start();
    };

    return (
        <div className="fixed inset-x-0 bottom-0 z-30 animate-slide-up border-t border-line bg-surface/97 shadow-[0_-10px_30px_-15px_rgb(0_0_0/0.3)] backdrop-blur lg:start-72">
            <div className="mx-auto max-w-4xl px-4 py-3">
                <div className="flex items-center gap-3">
                    <MicButton size="md" listening={speech.listening} onClick={speech.listening ? speech.stop : start} />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-ink">{speech.listening ? t('Listening… recite from memory') : t('Recite with your voice')}</p>
                        <p className="truncate text-xs text-muted">{label}</p>
                    </div>
                    {check.reached > 0 && <ScoreRing score={check.score} size={54} />}
                    <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t('Close')}>
                        <X />
                    </Button>
                </div>

                {speech.error ? (
                    <SpeechErrorNotice error={speech.error} className="mt-3" />
                ) : (
                    <div className="mt-3 max-h-[26vh] overflow-y-auto rounded-2xl bg-surface-muted/70 px-4 py-1.5 ring-1 ring-line" aria-live="polite">
                        {check.heard.length > 0 ? (
                            <HeardText heard={check.heard} className="text-xl" />
                        ) : (
                            <p className="py-3 text-center text-sm text-muted">{t('Start reciting: what you say is written here, and your mistakes are marked on the page.')}</p>
                        )}
                    </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2.5">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                            {t(':count right', { count: formatNumber(counts.correct, locale) })}
                        </span>
                        <span className="rounded-full bg-gold-50 px-2.5 py-1 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300">
                            {t(':count mistakes', { count: formatNumber(counts.mistakes, locale) })}
                        </span>
                        <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                            {t(':count forgotten', { count: formatNumber(counts.missing, locale) })}
                        </span>
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

                <RecitationLimitsNote className="mt-2" />
            </div>
        </div>
    );
}
