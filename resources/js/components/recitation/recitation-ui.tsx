import { Info, Mic, MicOff, Square, Star } from 'lucide-react';
import { Fragment } from 'react';
import type { SpeechError } from '@/hooks/use-speech-recognition';
import { useTrans } from '@/lib/i18n';
import type { HeardWord, LetterKind, WordStatus } from '@/lib/recitation-check';
import { cn } from '@/lib/utils';

const letterClasses: Record<LetterKind, string> = {
    ok: '',
    wrong: 'text-rose-600 dark:text-rose-400',
    extra: 'text-rose-600 underline decoration-wavy decoration-rose-400 underline-offset-8 dark:text-rose-400',
    missing: 'text-rose-500/55 dark:text-rose-300/55',
};

/**
 * Colors of an expected word once recited.
 */
export const wordStatusClasses: Record<WordStatus, string> = {
    correct: 'text-emerald-700 dark:text-emerald-300',
    close: 'text-gold-700 decoration-gold-500 underline decoration-2 underline-offset-[0.35em] dark:text-gold-300',
    wrong: 'text-rose-600 decoration-rose-500 underline decoration-2 underline-offset-[0.35em] dark:text-rose-400',
    missing: 'text-rose-500/70 line-through decoration-rose-500/70 dark:text-rose-300/70',
    pending: '',
};

/**
 * What the reader said, letter by letter: wrong letters in red, letters left out in faded red.
 */
export function HeardText({ heard, className }: { heard: HeardWord[]; className?: string }) {
    return (
        <p dir="rtl" className={cn('font-quran leading-[2.2] text-ink', className)}>
            {heard.map((word, index) => (
                <Fragment key={index}>
                    <span
                        className={cn(
                            'rounded-lg',
                            word.status === 'correct' && 'text-emerald-700 dark:text-emerald-300',
                            word.status === 'extra' && 'bg-rose-50 px-1 text-rose-700 line-through decoration-rose-400 dark:bg-rose-500/10 dark:text-rose-300',
                        )}
                    >
                        {word.status === 'extra' || word.status === 'correct'
                            ? word.text
                            : word.letters.map((mark, position) => (
                                  <span key={position} className={letterClasses[mark.kind]}>
                                      {mark.letter}
                                  </span>
                              ))}
                    </span>{' '}
                </Fragment>
            ))}
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
export function RecitationLimitsNote({ className }: { className?: string }) {
    const { t } = useTrans();

    return (
        <p className={cn('flex items-start gap-1.5 text-xs leading-relaxed text-muted', className)}>
            <Info className="mt-0.5 size-3.5 shrink-0" />
            {t('The check compares words and letters. Speech recognition does not hear the vowels (fatha, kasra) or tajweed, so ask a teacher about those.')}
        </p>
    );
}
