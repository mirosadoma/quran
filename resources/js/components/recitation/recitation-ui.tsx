import { CircleAlert, Info, LoaderCircle, Mic, MicOff, Square, Star, Trash2, Volume2 } from 'lucide-react';
import { Fragment, type ReactNode, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/form';
import type { RecitationVoice } from '@/hooks/use-recitation-voice';
import type { SpeechError } from '@/hooks/use-speech-recognition';
import { letterClusters } from '@/lib/arabic';
import { useTrans } from '@/lib/i18n';
import type { MistakeKind, RecitationMistake, WordStatus } from '@/lib/recitation-check';
import { cn, formatNumber } from '@/lib/utils';

/**
 * Colors of a word of the ayah while reciting.
 */
export const wordStatusClasses: Record<WordStatus, string> = {
    pending: '',
    current: 'bg-primary-100/70 ring-2 ring-primary-400/80 dark:bg-primary-500/15',
    correct: 'text-emerald-700 dark:text-emerald-300',
    vowel: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
    close: 'bg-gold-50 text-gold-700 dark:bg-gold-500/10 dark:text-gold-300',
    wrong: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
};

/** The word to say now, after a mistake on it. */
export const blockedWordClasses = 'bg-rose-100 ring-2 ring-rose-400 dark:bg-rose-500/20';

/**
 * A word with its letters read wrong (red) and read with another vowel (violet).
 */
export function MarkedWord({ word, letters = [], vowels = [] }: { word: string; letters?: number[]; vowels?: number[] }) {
    if (letters.length === 0 && vowels.length === 0) {
        return <>{word}</>;
    }

    return (
        <>
            {letterClusters(word).map((cluster, position) =>
                letters.includes(position) || vowels.includes(position) ? (
                    <span key={position} className="recitation-letter" data-kind={letters.includes(position) ? 'letter' : 'vowel'}>
                        {cluster}
                    </span>
                ) : (
                    <Fragment key={position}>{cluster}</Fragment>
                ),
            )}
        </>
    );
}

/**
 * The words said right so far, written as the reader goes (nothing else is written).
 */
export function RecitedText({ words, placeholder, className }: { words: string[]; placeholder: string; className?: string }) {
    if (words.length === 0) {
        return <p className="py-3 text-center text-sm text-muted">{placeholder}</p>;
    }

    return (
        <p dir="rtl" className={cn('font-quran leading-[2.2] text-ink', className)}>
            {words.join(' ')}
        </p>
    );
}

export function useMistakeLabels(): Record<MistakeKind, string> {
    const { t } = useTrans();

    return {
        letter: t('Wrong letters'),
        vowel: t('Wrong vowel'),
        word: t('Another word'),
        skipped: t('Word left out'),
        helped: t('Prompted'),
    };
}

/**
 * The mistake the reader has to put right before going on, with what was heard.
 */
export function BlockedNotice({ mistake, onPrompt, className }: { mistake: RecitationMistake; onPrompt: () => void; className?: string }) {
    const { t } = useTrans();
    const message =
        mistake.kind === 'skipped'
            ? t('You left out a word: say it before going on.')
            : mistake.kind === 'word'
              ? t('That is not the next word: say the right word to go on.')
              : t('Mistake in this word: say it again correctly to go on.');

    return (
        <div className={cn('flex animate-fade-in flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-rose-50 px-3 py-2.5 text-sm text-rose-800 ring-1 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30', className)} role="alert">
            <CircleAlert className="size-5 shrink-0" />
            <div className="min-w-0 flex-1">
                <p className="font-semibold">{message}</p>
                {mistake.heard && (
                    <p className="mt-0.5 text-xs">
                        {t('You said')}:{' '}
                        <span dir="rtl" className="font-quran text-lg leading-none">
                            <MarkedWord word={mistake.heard} letters={mistake.heardLetters} vowels={mistake.heardVowels} />
                        </span>
                    </p>
                )}
            </div>
            <Button variant="secondary" size="sm" onClick={onPrompt}>
                {t('Say the word for me')}
            </Button>
        </div>
    );
}

/**
 * The mistakes made since the page was opened, newest first, each with the letters read wrong and what
 * was said instead. They are kept until the page is reloaded.
 */
export function MistakeList({ mistakes, onClear, className }: { mistakes: RecitationMistake[]; onClear?: () => void; className?: string }) {
    const { t, locale } = useTrans();
    const labels = useMistakeLabels();

    // The same mistake said again is shown once, with how many times.
    const rows = useMemo(() => {
        const grouped = new Map<string, { mistake: RecitationMistake; times: number }>();

        for (const mistake of mistakes) {
            const key = `${mistake.ayahId}:${mistake.index}:${mistake.kind}:${mistake.heard ?? ''}`;
            const row = grouped.get(key);

            if (row) {
                row.times++;
            } else {
                grouped.set(key, { mistake, times: 1 });
            }
        }

        return [...grouped.values()].reverse();
    }, [mistakes]);

    if (rows.length === 0) {
        return null;
    }

    return (
        <div className={cn('rounded-2xl bg-surface-muted/70 p-3 ring-1 ring-line', className)}>
            <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-ink">
                    {t('Your mistakes')} <span className="text-muted">({formatNumber(mistakes.length, locale)})</span>
                </p>
                {onClear && (
                    <Button variant="ghost" size="sm" onClick={onClear} className="h-7 px-2 text-xs">
                        <Trash2 />
                        {t('Clear the marks')}
                    </Button>
                )}
            </div>
            <ul className="max-h-40 space-y-1.5 overflow-y-auto">
                {rows.map(({ mistake, times }, index) => (
                    <li key={index} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <span dir="rtl" className="font-quran text-xl leading-snug text-ink">
                            <MarkedWord word={mistake.written} letters={mistake.letters} vowels={mistake.vowels} />
                        </span>
                        <MistakeBadge kind={mistake.kind}>{labels[mistake.kind]}</MistakeBadge>
                        {mistake.heard && mistake.kind !== 'skipped' && (
                            <span className="text-xs text-muted">
                                {t('You said')}:{' '}
                                <span dir="rtl" className="font-quran text-base text-ink">
                                    <MarkedWord word={mistake.heard} letters={mistake.heardLetters} vowels={mistake.heardVowels} />
                                </span>
                            </span>
                        )}
                        {times > 1 && <span className="text-xs text-muted">× {formatNumber(times, locale)}</span>}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function MistakeBadge({ kind, children }: { kind: MistakeKind; children: ReactNode }) {
    return (
        <span
            className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                kind === 'vowel' && 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
                kind === 'letter' && 'bg-gold-100 text-gold-800 dark:bg-gold-500/15 dark:text-gold-300',
                (kind === 'word' || kind === 'skipped') && 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
                kind === 'helped' && 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
            )}
        >
            {children}
        </span>
    );
}

/**
 * Settings of the check: hearing the vowels (when the server can), and the alert sound on mistakes.
 */
export function RecitationOptions({ voice, sound, onSound, className }: { voice: RecitationVoice; sound: boolean; onSound: (value: boolean) => void; className?: string }) {
    const { t } = useTrans();

    return (
        <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2.5 text-sm text-ink', className)}>
            {voice.vowelCheckAvailable && (
                <label className="flex cursor-pointer items-center gap-2">
                    <Switch checked={voice.vowelCheck} onChange={voice.setVowelCheck} />
                    <span className="font-quran text-base leading-none text-violet-600 dark:text-violet-300">بَ بُ بِ</span>
                    {t('Check the vowels')}
                </label>
            )}
            <label className="flex cursor-pointer items-center gap-2">
                <Switch checked={sound} onChange={onSound} />
                <Volume2 className="size-4 text-muted" />
                {t('Alert sound on mistakes')}
            </label>
        </div>
    );
}

/**
 * The passages still being checked on the server (the vowels are heard after each pause).
 */
export function VowelCheckBusy({ className }: { className?: string }) {
    const { t } = useTrans();

    return (
        <p className={cn('flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300', className)}>
            <LoaderCircle className="size-3.5 animate-spin" />
            {t('Checking the vowels…')}
        </p>
    );
}

export function MicButton({ listening, onClick, disabled, size = 'lg', className }: { listening: boolean; onClick: () => void; disabled?: boolean; size?: 'md' | 'lg'; className?: string }) {
    const { t } = useTrans();
    const label = listening ? t('Stop') : t('Recite with your voice');

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={listening}
            aria-label={label}
            title={label}
            className={cn(
                'relative inline-flex shrink-0 items-center justify-center rounded-full text-white shadow-lg transition active:scale-95 disabled:opacity-50',
                listening ? 'bg-rose-600 shadow-rose-600/30 hover:bg-rose-700' : 'bg-primary-700 shadow-primary-900/25 hover:bg-primary-800 dark:bg-primary-600',
                size === 'lg' ? 'size-20 [&_svg]:size-8' : 'size-12 [&_svg]:size-5',
                className,
            )}
        >
            {listening && <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/35" />}
            {listening ? <Square className="relative fill-current" /> : <Mic className="relative" />}
        </button>
    );
}

/**
 * Accuracy of a recitation in a ring.
 */
export function ScoreRing({ score, size = 96, className }: { score: number; size?: number; className?: string }) {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const tone = score >= 90 ? 'text-emerald-500' : score >= 70 ? 'text-gold-500' : 'text-rose-500';

    return (
        <div className={cn('relative shrink-0', className)} style={{ width: size, height: size }}>
            <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
                <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" className="stroke-line" />
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="none"
                    strokeWidth="9"
                    strokeLinecap="round"
                    stroke="currentColor"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - score / 100)}
                    className={cn('transition-[stroke-dashoffset] duration-700', tone)}
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-ink tabular-nums" style={{ fontSize: size / 4.4 }}>
                {score}%
            </span>
        </div>
    );
}

export function scoreStars(score: number): number {
    return score >= 90 ? 3 : score >= 70 ? 2 : score >= 40 ? 1 : 0;
}

export function Stars({ count, total = 3, className }: { count: number; total?: number; className?: string }) {
    return (
        <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${count} / ${total}`}>
            {Array.from({ length: total }, (_, index) => (
                <Star key={index} className={cn('size-[1em]', index < count ? 'fill-gold-400 text-gold-500' : 'text-line-strong')} />
            ))}
        </span>
    );
}

export function SpeechErrorNotice({ error, className }: { error: SpeechError; className?: string }) {
    const { t } = useTrans();

    const messages: Record<SpeechError, string> = {
        unsupported: t('This browser cannot turn speech into text. Use Chrome, Edge or Safari.'),
        insecure: t('The microphone works only on the secure address of the platform (https://).'),
        denied: t('The microphone is blocked. Allow it from the site settings, then try again.'),
        'no-microphone': t('No microphone was found on this device.'),
        network: t('Speech recognition needs an internet connection. Check it and try again.'),
        language: t('This browser cannot recognize Arabic speech.'),
        failed: t('Speech recognition stopped. Try again.'),
        service: t('The vowel check is not available right now. Turn it off to recite with the speech recognition of the browser.'),
    };

    return (
        <p className={cn('flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm leading-relaxed text-rose-700 dark:bg-rose-500/10 dark:text-rose-300', className)}>
            <MicOff className="mt-0.5 size-4 shrink-0" />
            {messages[error]}
        </p>
    );
}

/**
 * What the check can and cannot hear.
 */
export function RecitationLimitsNote({ vowels, className }: { vowels: boolean; className?: string }) {
    const { t } = useTrans();

    return (
        <p className={cn('flex items-start gap-1.5 text-xs leading-relaxed text-muted', className)}>
            <Info className="mt-0.5 size-3.5 shrink-0" />
            {vowels
                ? t('The vowels are checked by a model trained on Quran recitation, after each pause; it can be wrong at times. Tajweed is not checked, so ask a teacher about it.')
                : t('The check compares words and letters. Speech recognition does not hear the vowels (fatha, kasra) or tajweed, so ask a teacher about those.')}
        </p>
    );
}
