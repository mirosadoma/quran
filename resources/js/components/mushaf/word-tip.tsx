import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface WordTipTarget {
    element: HTMLElement;
    word: string;
    meaning: string;
}

/**
 * The meaning of a word, in a bubble above it (below when there is no room).
 */
export function WordTip({ target }: { target: WordTipTarget | null }) {
    const bubble = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<{ left: number; top: number; arrow: number; below: boolean } | null>(null);

    useLayoutEffect(() => {
        if (!target || !bubble.current) {
            setPosition(null);

            return;
        }

        const word = target.element.getBoundingClientRect();
        const { width, height } = bubble.current.getBoundingClientRect();
        const margin = 8;
        const center = word.left + word.width / 2;
        const left = Math.min(Math.max(margin, center - width / 2), window.innerWidth - width - margin);
        const below = word.top - height - 12 < margin;

        setPosition({ left, top: below ? word.bottom + 10 : word.top - height - 10, arrow: center - left, below });
    }, [target]);

    useEffect(() => {
        const element = target?.element;
        element?.setAttribute('data-active', 'true');

        return () => element?.removeAttribute('data-active');
    }, [target]);

    if (!target) {
        return null;
    }

    return createPortal(
        <div
            ref={bubble}
            role="tooltip"
            className={cn(
                'pointer-events-none fixed z-[60] w-max max-w-[min(20rem,calc(100vw-1rem))] animate-fade-in rounded-2xl bg-[#17231e] px-4 py-2.5 text-center shadow-2xl shadow-black/25 ring-1 ring-white/10',
                !position && 'invisible',
            )}
            style={{ left: position?.left ?? 0, top: position?.top ?? 0 }}
        >
            <p dir="rtl" className="font-quran text-xl leading-snug text-gold-300">
                {target.word}
            </p>
            <p dir="rtl" className="mt-0.5 text-sm leading-relaxed font-medium text-white">
                {target.meaning}
            </p>
            <span
                className={cn('absolute size-3 rotate-45 bg-[#17231e]', position?.below ? '-top-1.5' : '-bottom-1.5')}
                style={{ left: (position?.arrow ?? 0) - 6 }}
            />
        </div>,
        document.body,
    );
}
