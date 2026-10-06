import { ChevronLeft, ChevronRight } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { useTrans } from '@/lib/i18n';
import { TOTAL_PAGES } from '@/lib/mushaf';
import { arabicDigits } from '@/lib/quran';
import { cn } from '@/lib/utils';

interface PageNavigatorProps {
    /** The page shown (the right one of two facing pages). */
    page: number;
    /** The left page when two facing pages are shown. */
    left: number | null;
    /** Fewer page numbers on narrow screens. */
    compact: boolean;
    onGo: (page: number) => void;
    onPrevious: () => void;
    onNext: () => void;
}

/**
 * A page number typed with Arabic (٠-٩), Persian (۰-۹) or Latin digits.
 */
function parsePage(value: string): number | null {
    const digits = value
        .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
        .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
        .replace(/\D/g, '');

    return digits === '' ? null : Math.min(TOTAL_PAGES, Math.max(1, Number(digits)));
}

/**
 * Moving through the mushaf under the pages: previous and next, the numbers of the pages around like a
 * pagination, the page number in the middle to type another one, and a slider for long jumps. It keeps
 * its own state, so typing or dragging does not redraw the pages.
 */
export const PageNavigator = memo(function PageNavigator({ page, left, compact, onGo, onPrevious, onNext }: PageNavigatorProps) {
    const { t, locale } = useTrans();
    const [typed, setTyped] = useState<string | null>(null);
    const [slider, setSlider] = useState<number | null>(null);
    // Escape leaves the field without going to the page typed.
    const cancelled = useRef(false);
    const selecting = useRef(false);
    const number =(value: number) => (locale === 'ar' ? arabicDigits(value) : String(value));
    const shown = left ? [page, left] : [page];
    const first = shown[0];
    const last = shown[shown.length - 1];
    const around = compact ? 1 : 2;

    // The page changed elsewhere (the book was turned): show it.
    useEffect(() => {
        setTyped(null);
        setSlider(null);
    }, [page]);

    // Page numbers before and after the open pages, with the first and the last page of the mushaf.
    const before = [1, ...Array.from({ length: around }, (_, index) => first - around + index)].filter((value, index, list) => value >= 1 && value < first && list.indexOf(value) === index);
    const after = [...Array.from({ length: around }, (_, index) => last + 1 + index), TOTAL_PAGES].filter((value, index, list) => value > last && value <= TOTAL_PAGES && list.indexOf(value) === index);

    const go = (target: number) => {
        if (!shown.includes(target)) {
            onGo(target);
        }
    };

    const submit = () => {
        const target = typed === null ? null : parsePage(typed);
        setTyped(null);

        if (target !== null) {
            go(target);
        }
    };

    /**
     * Leave the field without going to a page again on blur (after Enter or Escape), so the arrow
     * keys turn the pages again.
     */
    const leave = (input: HTMLInputElement) => {
        cancelled.current = true;
        input.blur();
    };

    const commitSlider = () => {
        if (slider !== null) {
            go(slider);
            setSlider(null);
        }
    };

    const numbers = (pages: number[]) =>
        pages.map((value, index) => {
            const gap = index > 0 && value - pages[index - 1] > 1;

            return (
                <span key={value} className="contents">
                    {gap && <span className="px-0.5 text-muted">…</span>}
                    <button
                        type="button"
                        onClick={() => go(value)}
                        className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-1.5 text-sm font-semibold text-ink tabular-nums transition hover:bg-primary-50 hover:text-primary-800 dark:hover:bg-primary-500/10 dark:hover:text-primary-200"
                        aria-label={t('Page :page', { page: number(value) })}
                    >
                        {number(value)}
                    </button>
                </span>
            );
        });

    return (
        <nav className="mx-auto mt-6 max-w-2xl" aria-label={t('Pages')} dir="rtl">
            <div className="flex items-center justify-center gap-1 rounded-2xl border border-line bg-surface/80 p-1.5 shadow-xs backdrop-blur">
                <button
                    type="button"
                    onClick={onPrevious}
                    disabled={first <= 1}
                    aria-label={t('Previous page')}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-ink transition hover:bg-surface-muted disabled:opacity-30"
                >
                    <ChevronRight className="size-5" />
                </button>

                {numbers(before)}

                <input
                    type="text"
                    inputMode="numeric"
                    value={typed ?? (left ? `${number(page)}-${number(left)}` : number(page))}
                    onFocus={(event) => {
                        // The page number is selected: typing replaces it.
                        event.currentTarget.select();
                        selecting.current = true;
                    }}
                    onMouseUp={(event) => {
                        // The click that focused the field would otherwise undo the selection.
                        if (selecting.current) {
                            event.preventDefault();
                            selecting.current = false;
                        }
                    }}
                    onChange={(event) => setTyped(event.target.value)}
                    onBlur={() => {
                        if (cancelled.current) {
                            cancelled.current = false;

                            return;
                        }

                        submit();
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            submit();
                            leave(event.currentTarget);
                        } else if (event.key === 'Escape') {
                            setTyped(null);
                            leave(event.currentTarget);
                        }
                    }}
                    aria-label={t('Page number')}
                    title={t('Type a page number and press Enter')}
                    className={cn(
                        'h-9 rounded-xl border-2 border-primary-500 bg-primary-50 text-center text-sm font-bold text-primary-900 tabular-nums outline-none focus:ring-4 focus:ring-primary-500/20 dark:bg-primary-500/15 dark:text-primary-100',
                        left ? 'w-20' : 'w-14',
                    )}
                />

                {numbers(after)}

                <button
                    type="button"
                    onClick={onNext}
                    disabled={last >= TOTAL_PAGES}
                    aria-label={t('Next page')}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-ink transition hover:bg-surface-muted disabled:opacity-30"
                >
                    <ChevronLeft className="size-5" />
                </button>
            </div>

            <div className="mt-2 flex items-center gap-3 px-2">
                <input
                    type="range"
                    min={1}
                    max={TOTAL_PAGES}
                    value={slider ?? page}
                    onChange={(event) => setSlider(Number(event.target.value))}
                    onPointerUp={commitSlider}
                    onKeyUp={commitSlider}
                    className="h-1.5 min-w-0 flex-1 accent-primary-600"
                    aria-label={t('Page')}
                />
                <span className="w-20 shrink-0 text-center text-xs text-muted tabular-nums">{t(':page of :total', { page: number(slider ?? page), total: number(TOTAL_PAGES) })}</span>
            </div>
        </nav>
    );
});
