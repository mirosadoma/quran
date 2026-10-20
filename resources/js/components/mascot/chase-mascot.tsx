import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { MascotFace } from '@/components/mascot/mascot-face';
import { useTrans } from '@/lib/i18n';
import { CHASE_ACTOR, type ChasePhase, createChase } from '@/lib/mascot/chase';
import { CHASE_TIMING, MASCOT_VISITS } from '@/lib/mascot/config';

const look = { halo: 'gold', body: 'round', eyes: 'open', accessory: 'none' } as const;

/** How far from the edges of the page it pops up. */
const EDGE = 24;

const timingStyle = {
    '--chase-width': `${CHASE_ACTOR.width}px`,
    '--chase-height': `${CHASE_ACTOR.height}px`,
    '--chase-enter': `${CHASE_TIMING.enter}ms`,
    '--chase-swallow': `${CHASE_TIMING.swallow}ms`,
    '--chase-fall': `${CHASE_TIMING.fall}ms`,
    '--pit-open': `${CHASE_TIMING.pitOpen}ms`,
    '--pit-close': `${CHASE_TIMING.pitClose}ms`,
} as CSSProperties;

/**
 * The chase: a grinning lantern pops up from the corner opposite to the first visit, runs after the pointer,
 * opens its jaws when close, eats the pointer (the real one hides, a drawn one slides into its mouth), then
 * falls into a pit that opens under its feet; or gives up and falls when the pointer stays still too long.
 * Calls onDone once when it is gone. The moves are written straight to the elements, frame by frame
 * (lib/mascot/chase.ts); React only learns of the mouth, the pit and the phase.
 */
export function ChaseMascot({ onDone }: { onDone: () => void }) {
    const { isRtl } = useTrans();
    const actor = useRef<HTMLDivElement>(null);
    const body = useRef<HTMLDivElement>(null);
    const shadow = useRef<HTMLDivElement>(null);
    const pit = useRef<HTMLDivElement>(null);
    const cursor = useRef<HTMLDivElement>(null);
    const done = useRef(false);
    const [phase, setPhase] = useState<ChasePhase>('hidden');
    const [jaws, setJaws] = useState(false);
    const [chomp, setChomp] = useState(false);
    const [falling, setFalling] = useState(false);
    const [pitOpen, setPitOpen] = useState(false);
    const [swallowed, setSwallowed] = useState(false);

    useEffect(() => {
        const root = document.documentElement;
        // The corner opposite to the first visit (inline start / end follow the direction of the language).
        const fromStart = MASCOT_VISITS[0]?.position.endsWith('-end') ?? true;

        const chase = createChase({
            now: () => performance.now(),
            requestFrame: (callback) => window.requestAnimationFrame(() => callback()),
            cancelFrame: (id) => window.cancelAnimationFrame(id),
            viewport: () => ({ width: window.innerWidth, height: window.innerHeight }),
            entry: () => ({
                x: fromStart !== isRtl ? EDGE : window.innerWidth - CHASE_ACTOR.width - EDGE,
                y: window.innerHeight - CHASE_ACTOR.height - EDGE,
            }),
            onPhase: setPhase,
            onMouth: setJaws,
            onFrame: ({ x, y, tilt, hop, stretch }) => {
                if (actor.current) {
                    actor.current.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
                }

                if (body.current) {
                    body.current.style.transform = `translateY(${-hop.toFixed(1)}px) rotate(${tilt.toFixed(1)}deg) scale(${(1 - stretch * 0.08).toFixed(3)}, ${(1 + stretch * 0.08).toFixed(3)})`;
                }

                if (shadow.current) {
                    shadow.current.style.setProperty('--shadow', (1 - hop / 30).toFixed(2));
                    shadow.current.style.setProperty('--shadow-opacity', (0.9 - hop / 25).toFixed(2));
                }
            },
            onCursorHidden: (hidden) => root.classList.toggle('mascot-cursor-hidden', hidden),
            onEat: (from, mouth) => {
                const element = cursor.current;

                if (element) {
                    element.style.left = `${from.x}px`;
                    element.style.top = `${from.y}px`;
                    element.style.setProperty('--to-x', `${mouth.x - from.x}px`);
                    element.style.setProperty('--to-y', `${mouth.y - from.y}px`);
                }

                setSwallowed(true);
            },
            onChomp: () => setChomp(true),
            onPit: (open, feet) => {
                if (open && pit.current) {
                    pit.current.style.left = `${feet.x}px`;
                    pit.current.style.top = `${feet.y}px`;
                }

                setPitOpen(open);
            },
            onFall: () => setFalling(true),
            onDone: () => {
                if (!done.current) {
                    done.current = true;
                    onDone();
                }
            },
        });

        const onMove = (event: PointerEvent) => chase.pointerMoved(event.clientX, event.clientY);
        window.addEventListener('pointermove', onMove, { passive: true });
        chase.start();

        return () => {
            window.removeEventListener('pointermove', onMove);
            chase.stop();
            root.classList.remove('mascot-cursor-hidden');
        };
    }, [isRtl, onDone]);

    return (
        <div className="mascot-chase" data-phase={phase} data-mouth={jaws ? 'jaws' : 'grin'} style={timingStyle} aria-hidden>
            <div ref={pit} className="mascot-pit" data-open={pitOpen ? 'true' : undefined} />
            <div ref={actor} className="mascot-chase-actor">
                <div ref={shadow} className="mascot-chase-shadow" />
                <div className="mascot-chase-clip">
                    <div
                        ref={body}
                        className="mascot-chase-body"
                        data-chomp={chomp ? 'true' : undefined}
                        data-fall={falling ? 'true' : undefined}
                        onAnimationEnd={(event) => event.animationName === 'mascot-chomp' && setChomp(false)}
                    >
                        <MascotFace look={look} mood={jaws ? 'jaws' : 'grin'} arms={jaws ? 'wave' : 'rest'} size={`${CHASE_ACTOR.height}px`} />
                    </div>
                </div>
            </div>
            <div ref={cursor} className="mascot-fake-cursor" data-swallowed={swallowed ? 'true' : undefined}>
                <svg viewBox="0 0 24 24" width="20" height="24" aria-hidden>
                    <path d="M2 2 L2 20 L7 15.5 L10.5 23 L13.5 21.7 L10 14 L17 14 Z" fill="#fff" stroke="#111" strokeWidth={1.4} strokeLinejoin="round" />
                </svg>
            </div>
        </div>
    );
}
