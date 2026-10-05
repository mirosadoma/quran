import { Fragment, memo, type MouseEvent, type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTrans } from '@/lib/i18n';
import { highlightClasses } from '@/lib/mushaf';
import { arabicDigits, surahName } from '@/lib/quran';
import { cn } from '@/lib/utils';
import type { MushafAyah, MushafHighlightItem } from '@/types';

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

    return (
        <div
            className={cn(
                'mushaf-paper relative overflow-hidden shadow-[0_18px_45px_-20px_rgb(0_0_0/0.45)] select-none',
                side === 'right' && 'mushaf-gutter-left rounded-e-[1.1rem] rounded-s-md',
                side === 'left' && 'mushaf-gutter-right rounded-s-[1.1rem] rounded-e-md',
                side === 'single' && 'rounded-2xl',
            )}
            style={{ width, height }}
        >
            <div className="mushaf-frame" />

            <div
                className="absolute inset-x-[7%] top-[4.6%] flex items-center justify-between text-gold-700 dark:text-gold-300"
                style={{ fontSize: Math.max(10, width / 40) }}
            >
                <span className="font-quran">{first ? `${t('Surah')} ${surahName(first.surah, 'ar')}` : ''}</span>
                <span className="font-quran">{first ? `${t('Juz')} ${arabicDigits(first.juz)}` : ''}</span>
            </div>

            <div ref={bodyRef} className={cn('absolute inset-x-[7.5%] top-[9.5%] bottom-[8.5%] overflow-hidden', opening && 'flex flex-col justify-center')}>
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
                                        <AyahText text={ayah.text} number={ayah.ayah} />
                                    </span>{' '}
                                </Fragment>
                            );
                        })}
                    </div>
                ) : (
                    <PageSkeleton />
                )}
            </div>

            <div className="absolute inset-x-0 bottom-[3.9%] flex justify-center">
                <span
                    className="font-quran rounded-full border border-gold-500/40 px-3 text-gold-700 dark:text-gold-300"
                    style={{ fontSize: Math.max(10, width / 42) }}
                >
                    {arabicDigits(number)}
                </span>
            </div>
        </div>
    );
});

/**
 * Ayah text with the hizb (۞) and sajda (۩) signs in gold, ending with its number.
 * The last word stays on the same line as the number.
 */
function AyahText({ text, number }: { text: string; number: number }) {
    const split = text.lastIndexOf(' ');
    const head = split === -1 ? '' : text.slice(0, split + 1);
    const tail = split === -1 ? text : text.slice(split + 1);

    return (
        <>
            {withSigns(head)}
            <span className="whitespace-nowrap">
                {withSigns(tail)}
                <AyahMarker number={number} />
            </span>
        </>
    );
}

function withSigns(text: string): ReactNode[] {
    return text.split(/([۞۩])/u).map((part, index) =>
        part === '۞' || part === '۩' ? (
            <span key={index} className="text-gold-600 dark:text-gold-400">
                {part}
            </span>
        ) : (
            part
        ),
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
            <div className="relative flex-1 rounded-[0.45em] border border-gold-500/70 bg-linear-to-l from-gold-100/80 via-gold-50/70 to-gold-100/80 py-[0.05em] text-center text-[0.95em] text-gold-800 shadow-[inset_0_0_0_3px_color-mix(in_oklab,var(--color-gold-200)_60%,transparent)] dark:from-gold-500/15 dark:via-gold-500/5 dark:to-gold-500/15 dark:text-gold-200 dark:shadow-none">
                سُورَةُ {surahName(surah, 'ar')}
            </div>
            <Ornament />
        </div>
    );
}

function Ornament() {
    return (
        <svg viewBox="0 0 24 24" className="size-[1.1em] shrink-0 text-gold-500" aria-hidden>
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
