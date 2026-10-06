import { Fragment, memo, type MouseEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { hasLetters, isJalalah } from '@/lib/arabic';
import { useTrans } from '@/lib/i18n';
import { highlightClasses } from '@/lib/mushaf';
import { arabicDigits, surahName } from '@/lib/quran';
import { frameMetrics, MushafFrame } from '@/components/mushaf/mushaf-frame';
import { MarkedWord } from '@/components/recitation/recitation-ui';
import type { WordMark } from '@/lib/recitation-check';
import { cn } from '@/lib/utils';
import type { MushafAyah, MushafHighlightItem } from '@/types';

/**
 * How the words are shown: the name of Allah in red, words with a meaning in green, and the
 * recitation (by ayah id, then word position): the word to say now, the words said, and the
 * mistakes with their letters; the words not recited yet can be hidden.
 */
export interface WordDisplay {
    jalalah: boolean;
    meanings: boolean;
    marks?: Map<number, Map<number, WordMark>>;
    hideUnrecited?: boolean;
}

const BASMALA = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

/**
 * Resolves when both parts of the mushaf font are ready (the Arabic letters, and the
 * spaces which come from the Latin part): pages measured before must fit their text again.
 */
const mushafFont: Promise<unknown> =
    typeof document !== 'undefined' && document.fonts
        ? document.fonts
              .load('24px "Amiri Quran"', 'بسم الله ab 12')
              .then(() => document.fonts.ready)
              .catch(() => undefined)
        : Promise.resolve();

export type PageSide = 'right' | 'left' | 'single';

interface MushafPageProps {
    number: number;
    ayahs: MushafAyah[] | undefined;
    width: number;
    height: number;
    side: PageSide;
    highlights?: Map<number, MushafHighlightItem>;
    selectedAyahId?: number | null;
    playingAyahId?: number | null;
    flashAyahId?: number | null;
    display: WordDisplay;
    onAyahClick?: (ayah: MushafAyah, event: MouseEvent<HTMLElement>) => void;
}

/**
 * One page of the mushaf. The text is set at the largest size that fits the frame,
 * so every page is full like a printed mushaf whatever the screen size.
 */
export const MushafPage = memo(function MushafPage({
    number,
    ayahs,
    width,
    height,
    side,
    highlights,
    selectedAyahId,
    playingAyahId,
    flashAyahId,
    display,
    onAyahClick,
}: MushafPageProps) {
    const { t } = useTrans();
    const bodyRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const [fontLoaded, setFontLoaded] = useState(false);
    const opening = number <= 2;
    const first = ayahs?.[0];

    useEffect(() => {
        let active = true;
        void mushafFont.then(() => active && setFontLoaded(true));

        return () => {
            active = false;
        };
    }, []);

    useLayoutEffect(() => {
        const body = bodyRef.current;
        const text = textRef.current;

        if (!body || !text || !ayahs) {
            return;
        }

        const fit = () => {
            const available = body.clientHeight;
            const max = Math.max(14, Math.min(width / (opening ? 13 : 16.5), 46));
            let low = 9;
            let high = max;
            let best = low;

            for (let step = 0; step < 12; step++) {
                const size = (low + high) / 2;
                text.style.fontSize = `${size}px`;

                if (text.scrollHeight <= available) {
                    best = size;
                    low = size;
                } else {
                    high = size;
                }
            }

            text.style.fontSize = `${best}px`;
        };

        fit();

        // Fit again if the text ever grows past the frame (a font arriving late).
        const observer = new ResizeObserver(() => {
            if (text.scrollHeight > body.clientHeight + 1) {
                fit();
            }
        });
        observer.observe(text);

        return () => observer.disconnect();
    }, [ayahs, width, height, opening, fontLoaded]);

    const frame = frameMetrics(width);
    const label = Math.max(10, Math.round(width / 40));
    const gap = Math.round(width * (width < 420 ? 0.014 : 0.02));
    const medallion = Math.max(26, frame.band * 2.4);
    // The text stays clear of the cartouches at the top and the medallion at the bottom.
    const top = Math.max(frame.inner + gap, Math.round(frame.outer + frame.band / 2 + label + 6));
    const bottom = Math.max(frame.inner + gap, Math.round(frame.outer + frame.band / 2 + medallion / 2 + 4));

    return (
        <div
            className={cn(
                'mushaf-paper relative overflow-hidden select-none',
                side === 'right' && 'mushaf-gutter-left mushaf-edge-right rounded-e-[1.1rem] rounded-s-md',
                side === 'left' && 'mushaf-gutter-right mushaf-edge-left rounded-s-[1.1rem] rounded-e-md',
                side === 'single' && 'mushaf-edge-single rounded-2xl',
            )}
            style={{ width, height }}
        >
            <MushafFrame width={width} height={height} />

            {/* The surah and the juz in cartouches on the top of the frame. */}
            <div className="absolute flex items-center justify-between" style={{ insetInline: frame.inner + gap, top: frame.outer + frame.band / 2, transform: 'translateY(-50%)', fontSize: label }}>
                {first ? <span className="mushaf-cartouche">{`${t('Surah')} ${surahName(first.surah, 'ar')}`}</span> : <span />}
                {first ? <span className="mushaf-cartouche">{`${t('Juz')} ${arabicDigits(first.juz)}`}</span> : <span />}
            </div>

            <div
                ref={bodyRef}
                className={cn('absolute overflow-hidden', opening && 'flex flex-col justify-center')}
                style={{ insetInline: frame.inner + gap, top, bottom }}
            >
                {ayahs ? (
                    <div ref={textRef} className="mushaf-text" dir="rtl" style={opening ? { textAlign: 'center' } : undefined}>
                        {ayahs.map((ayah) => {
                            const highlight = highlights?.get(ayah.id);

                            return (
                                <Fragment key={ayah.id}>
                                    {ayah.ayah === 1 && <SurahHeading surah={ayah.surah} />}
                                    {ayah.ayah === 1 && ayah.surah !== 1 && ayah.surah !== 9 && (
                                        <div className="mb-[0.15em] text-center" aria-hidden>
                                            {BASMALA}
                                        </div>
                                    )}
                                    <span
                                        role="button"
                                        tabIndex={-1}
                                        data-ayah={ayah.id}
                                        data-selected={selectedAyahId === ayah.id}
                                        data-playing={playingAyahId === ayah.id}
                                        data-flash={flashAyahId === ayah.id}
                                        className={cn('mushaf-ayah', highlight && highlightClasses[highlight.color].mark)}
                                        onClick={(event) => onAyahClick?.(ayah, event)}
                                        title={highlight?.note ?? undefined}
                                    >
                                        <AyahText ayah={ayah} display={display} />
                                    </span>{' '}
                                </Fragment>
                            );
                        })}
                    </div>
                ) : (
                    <PageSkeleton />
                )}
            </div>

            {/* The page number in a medallion on the bottom of the frame. */}
            <div className="absolute inset-x-0 flex justify-center" style={{ bottom: frame.outer + frame.band / 2, transform: 'translateY(50%)' }}>
                <span className="mushaf-medallion" style={{ fontSize: label, minWidth: medallion, height: medallion }}>
                    {arabicDigits(number)}
                </span>
            </div>
        </div>
    );
});

/**
 * Ayah text word by word, ending with its number; the last word stays on the same line as the number.
 * The hizb (۞) and sajda (۩) signs are gold.
 */
function AyahText({ ayah, display }: { ayah: MushafAyah; display: WordDisplay }) {
    const { t } = useTrans();
    const words = ayah.text.split(' ');
    const marks = display.marks?.get(ayah.id);
    let tail = words.length - 1;

    // Keep the last word with the signs that follow it (... وَٱقْتَرِب ۩).
    while (tail > 0 && !hasLetters(words[tail])) {
        tail--;
    }

    // A pause mark (ۖ) is hidden and shown with the word before it.
    let previousHidden = false;

    const render = (word: string, index: number): ReactNode => {
        if (word === '۞' || word === '۩') {
            return <span className="text-gold-600 dark:text-gold-400">{word}</span>;
        }

        const mark = marks?.get(index);
        const hidden = !!display.hideUnrecited && (hasLetters(word) ? !mark?.said : previousHidden);
        previousHidden = hidden;
        const recited = mark !== undefined && mark.status !== 'pending';
        const meaning = display.meanings && !recited ? ayah.meanings?.[index] : undefined;
        const jalalah = display.jalalah && !recited && isJalalah(word);

        if (!hidden && !recited && !meaning && !jalalah) {
            return word;
        }

        return (
            <span
                className={cn('mushaf-word', jalalah && 'mushaf-jalalah', meaning && 'mushaf-meaning', hidden && 'mushaf-hidden')}
                data-status={recited ? mark.status : undefined}
                data-blocked={mark?.blocked ? 'true' : undefined}
                data-meaning={meaning && !hidden ? meaning : undefined}
                title={mark && mark.heard.length > 0 && !hidden ? t('You said: :words', { words: mark.heard.join('، ') }) : undefined}
            >
                {/* The letters read wrong are not shown while the word is hidden. */}
                {hidden || !mark ? word : <MarkedWord word={word} letters={mark.letters} vowels={mark.vowels} />}
            </span>
        );
    };

    return (
        <>
            {words.slice(0, tail).map((word, index) => (
                <Fragment key={index}>
                    {render(word, index)}{' '}
                </Fragment>
            ))}
            <span className="whitespace-nowrap">
                {words.slice(tail).map((word, offset) => (
                    <Fragment key={tail + offset}>
                        {offset > 0 && ' '}
                        {render(word, tail + offset)}
                    </Fragment>
                ))}
                <AyahMarker number={ayah.ayah} />
            </span>
        </>
    );
}

/**
 * End of ayah ornament with its number.
 */
export function AyahMarker({ number }: { number: number }) {
    const digits = arabicDigits(number);

    return (
        <span className="ayah-marker">
            <svg viewBox="0 0 48 48" className="size-full" aria-hidden>
                <g fill="color-mix(in oklab, currentColor 10%, transparent)" stroke="currentColor" strokeWidth="1.7">
                    <rect x="10" y="10" width="28" height="28" rx="3" transform="rotate(45 24 24)" />
                    <rect x="10" y="10" width="28" height="28" rx="3" />
                </g>
                <circle cx="24" cy="24" r="11" fill="none" stroke="currentColor" strokeWidth="1.2" />
                <text
                    x="24"
                    y="25.5"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={digits.length > 2 ? 13 : 16}
                    fill="var(--paper-ink, currentColor)"
                    style={{ fontFamily: 'var(--font-mushaf)' }}
                >
                    {digits}
                </text>
            </svg>
        </span>
    );
}

/**
 * Decorated band announcing the start of a surah.
 */
function SurahHeading({ surah }: { surah: number }) {
    return (
        <div className="my-[0.3em] flex items-center gap-[0.4em]" aria-label={surahName(surah, 'ar')}>
            <Ornament />
            <div className="mushaf-surah-title relative flex-1 rounded-[0.45em] py-[0.08em] text-center text-[0.95em]">سُورَةُ {surahName(surah, 'ar')}</div>
            <Ornament />
        </div>
    );
}

function Ornament() {
    return (
        <svg viewBox="0 0 24 24" className="size-[1.1em] shrink-0 text-(--frame-ornament)" aria-hidden>
            <path fill="currentColor" d="M12 1.5 14.4 9.6 22.5 12 14.4 14.4 12 22.5 9.6 14.4 1.5 12 9.6 9.6Z" />
        </svg>
    );
}

function PageSkeleton() {
    return (
        <div className="flex h-full animate-pulse flex-col justify-center gap-[6%]">
            {Array.from({ length: 12 }, (_, index) => (
                <div key={index} className="h-[2.2%] rounded-full bg-gold-500/15" style={{ width: index === 11 ? '45%' : '100%', marginInline: 'auto' }} />
            ))}
        </div>
    );
}
