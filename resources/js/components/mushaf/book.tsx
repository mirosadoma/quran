import {
    type CSSProperties,
    type PointerEvent,
    type ReactNode,
    type Ref,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
    useSyncExternalStore,
} from 'react';
import { spreadOf } from '@/lib/mushaf';
import { cn } from '@/lib/utils';
import { MushafFrame } from './mushaf-frame';
import type { PageSide } from './mushaf-page';

export interface BookHandle {
    /** Turn to a page (with the page-turn animation). */
    turnTo: (page: number) => void;
}

interface BookProps {
    ref?: Ref<BookHandle>;
    /** Page shown; on wide screens the right page of the spread. */
    page: number;
    double: boolean;
    pageWidth: number;
    pageHeight: number;
    renderPage: (page: number, side: PageSide) => ReactNode;
    /** Called when a turn ends, with the new page. */
    onPageChange: (page: number) => void;
    onSwipe?: (direction: 'next' | 'prev') => void;
}

interface Turn {
    from: number;
    to: number;
    direction: 'next' | 'prev';
    running: boolean;
}

const DURATION = 760;
const EASING = 'cubic-bezier(0.645, 0.045, 0.355, 1)';

/**
 * The mushaf as a book: pages turn around the binding like paper (right to left for
 * Arabic). On wide screens two facing pages are shown, the odd one on the right.
 */
export function Book({ ref, page, double, pageWidth, pageHeight, renderPage, onPageChange, onSwipe }: BookProps) {
    const [turn, setTurn] = useState<Turn | null>(null);
    const reduceMotion = usePrefersReducedMotion();
    const turnRef = useRef<Turn | null>(null);
    const swipe = useRef<{ x: number; y: number } | null>(null);
    const swiped = useRef(false);

    turnRef.current = turn;

    const normalize = useCallback((value: number) => (double ? spreadOf(value).right : value), [double]);

    const finish = useCallback(() => {
        const current = turnRef.current;

        if (current) {
            turnRef.current = null;
            setTurn(null);
            onPageChange(current.to);
        }
    }, [onPageChange]);

    useImperativeHandle(
        ref,
        () => ({
            turnTo(target: number) {
                const running = turnRef.current;
                const from = normalize(running ? running.to : page);
                const to = normalize(target);

                if (running) {
                    onPageChange(running.to);
                }

                if (to === from) {
                    setTurn(null);

                    return;
                }

                if (reduceMotion) {
                    setTurn(null);
                    onPageChange(to);

                    return;
                }

                setTurn({ from, to, direction: to > from ? 'next' : 'prev', running: false });
            },
        }),
        [page, normalize, onPageChange, reduceMotion],
    );

    // Paint the leaf at its first angle, then let it turn.
    useEffect(() => {
        if (!turn || turn.running) {
            return;
        }

        let inner = 0;
        const outer = requestAnimationFrame(() => {
            inner = requestAnimationFrame(() => setTurn((current) => current && { ...current, running: true }));
        });

        return () => {
            cancelAnimationFrame(outer);
            cancelAnimationFrame(inner);
        };
    }, [turn]);

    // Safety net when the transition end is not reported (hidden tab).
    useEffect(() => {
        if (!turn?.running) {
            return;
        }

        const timer = window.setTimeout(finish, DURATION + 150);

        return () => window.clearTimeout(timer);
    }, [turn?.running, finish]);

    // Switching between one and two pages ends the current turn.
    useEffect(() => {
        if (turnRef.current) {
            finish();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [double]);

    const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
        swipe.current = { x: event.clientX, y: event.clientY };
    };

    const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
        const start = swipe.current;
        swipe.current = null;

        if (!start) {
            return;
        }

        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;

        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            swiped.current = true;
            window.setTimeout(() => (swiped.current = false), 350);
            // Arabic books open from the right: dragging the page to the right turns forward.
            onSwipe?.(dx > 0 ? 'next' : 'prev');
        }
    };

    const leafStyle = (origin: 'left' | 'right', from: number, to: number, running: boolean): CSSProperties =>
        ({
            width: pageWidth,
            height: pageHeight,
            transformOrigin: `${origin} center`,
            transform: `rotateY(${running ? to : from}deg)`,
            transition: running ? `transform ${DURATION}ms ${EASING}` : 'none',
            '--turn-duration': `${DURATION}ms`,
            '--shade-direction': origin === 'right' ? 'left' : 'right',
        }) as CSSProperties;

    const slot = (left: number, content: ReactNode, shaded = false) => (
        <div className={cn('absolute top-0', shaded && 'mushaf-turn-shade')} style={{ left, width: pageWidth, height: pageHeight, '--turn-duration': `${DURATION}ms` } as CSSProperties}>
            {content}
        </div>
    );

    const leaf = (left: number, origin: 'left' | 'right', from: number, to: number, front: ReactNode, back: ReactNode) => (
        <div
            className="mushaf-leaf"
            data-turning={turn?.running ? 'true' : 'false'}
            style={{ ...leafStyle(origin, from, to, !!turn?.running), left }}
            onTransitionEnd={(event) => {
                if (event.target === event.currentTarget && event.propertyName === 'transform') {
                    finish();
                }
            }}
        >
            <div className="mushaf-leaf-face">{front}</div>
            <div className="mushaf-leaf-face mushaf-leaf-back">{back}</div>
        </div>
    );

    let content: ReactNode;

    if (double) {
        const current = spreadOf(turn ? turn.from : page);
        const right = (number: number | null) => (number ? renderPage(number, 'right') : <BlankPage side="right" width={pageWidth} height={pageHeight} />);
        const left = (number: number | null) => (number ? renderPage(number, 'left') : <BlankPage side="left" width={pageWidth} height={pageHeight} />);

        if (!turn) {
            content = (
                <>
                    {slot(pageWidth, right(current.right))}
                    {slot(0, left(current.left))}
                </>
            );
        } else {
            const target = spreadOf(turn.to);

            content =
                turn.direction === 'next' ? (
                    <>
                        {slot(pageWidth, right(current.right))}
                        {slot(0, left(target.left), true)}
                        {leaf(0, 'right', 0, 180, left(current.left), right(target.right))}
                    </>
                ) : (
                    <>
                        {slot(0, left(current.left))}
                        {slot(pageWidth, right(target.right), true)}
                        {leaf(pageWidth, 'left', 0, -180, right(current.right), left(target.left))}
                    </>
                );
        }
    } else if (!turn) {
        content = slot(0, renderPage(page, 'single'));
    } else {
        content =
            turn.direction === 'next' ? (
                <>
                    {slot(0, renderPage(turn.to, 'single'), true)}
                    {leaf(0, 'right', 0, 180, renderPage(turn.from, 'single'), <BlankPage side="single" width={pageWidth} height={pageHeight} />)}
                </>
            ) : (
                <>
                    {slot(0, renderPage(turn.from, 'single'))}
                    {leaf(0, 'right', 180, 0, renderPage(turn.to, 'single'), <BlankPage side="single" width={pageWidth} height={pageHeight} />)}
                </>
            );
    }

    return (
        <div
            className="relative mx-auto touch-pan-y"
            style={{
                width: double ? pageWidth * 2 : pageWidth,
                height: pageHeight,
                perspective: double ? 2800 : 1900,
                overflowX: double ? 'visible' : 'clip',
            }}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => (swipe.current = null)}
            onClickCapture={(event) => {
                if (swiped.current) {
                    event.stopPropagation();
                    event.preventDefault();
                }
            }}
        >
            {content}
        </div>
    );
}

/**
 * The back of a turning page (or an empty side of the last spread).
 */
function BlankPage({ side, width, height }: { side: PageSide; width: number; height: number }) {
    return (
        <div
            className={cn(
                'mushaf-paper relative size-full',
                side === 'right' && 'rounded-e-[1.1rem]',
                side === 'left' && 'rounded-s-[1.1rem]',
                side === 'single' && 'rounded-2xl',
            )}
        >
            <MushafFrame width={width} height={height} className="opacity-40" />
        </div>
    );
}

const motionQuery = '(prefers-reduced-motion: reduce)';

function usePrefersReducedMotion(): boolean {
    return useSyncExternalStore(
        (onChange) => {
            const query = window.matchMedia(motionQuery);
            query.addEventListener('change', onChange);

            return () => query.removeEventListener('change', onChange);
        },
        () => window.matchMedia(motionQuery).matches,
        () => false,
    );
}
