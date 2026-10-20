import { type CSSProperties, type RefObject, useEffect, useId, useRef } from 'react';
import type { MascotBody, MascotLook } from '@/lib/mascot/looks';
import { cn } from '@/lib/utils';

export type MascotArms = 'rest' | 'wave' | 'point' | 'think' | 'farewell';
/** grin: a wide smile with a row of small teeth; jaws: the mouth wide open, teeth and tongue (the chase). */
export type MascotMood = 'happy' | 'sad' | 'thinking' | 'grin' | 'jaws';

export interface MascotFaceProps {
    look: MascotLook;
    arms?: MascotArms;
    mood?: MascotMood;
    /** The height of the lantern (CSS length). */
    size?: string;
    /** Put the busy hand (waving, pointing, under the chin) on the other side, for right-to-left pages. */
    mirrorArms?: boolean;
    /** The eyes follow the pointer. */
    track?: boolean;
    /** Blink, wave, pulse... false for visitors who asked their system for less motion. */
    animate?: boolean;
    className?: string;
    style?: CSSProperties;
}

interface Body {
    x: number;
    y: number;
    width: number;
    height: number;
    rx: number;
}

const BODIES: Record<MascotBody, Body> = {
    round: { x: 22, y: 27, width: 56, height: 66, rx: 28 },
    tall: { x: 27, y: 25, width: 46, height: 72, rx: 21 },
    wide: { x: 17, y: 31, width: 66, height: 58, rx: 26 },
};

const FACE = { eyeY: 55, leftEye: 40, rightEye: 60, mouthY: 67, cheekY: 63 };

/**
 * The eyes follow the pointer: the pupils move with the two CSS variables --eye-x / --eye-y of the lantern.
 */
function useEyeTracking(ref: RefObject<SVGSVGElement | null>, enabled: boolean): void {
    useEffect(() => {
        const element = ref.current;

        if (!enabled || !element || typeof window === 'undefined') {
            return;
        }

        let frame = 0;
        let pointer: { x: number; y: number } | null = null;

        const clamp = (value: number) => Math.max(-1, Math.min(1, value));

        const apply = () => {
            frame = 0;

            if (!pointer) {
                return;
            }

            const rect = element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height * 0.46;
            const x = clamp((pointer.x - centerX) / Math.max(rect.width * 2.5, 1));
            const y = clamp((pointer.y - centerY) / Math.max(rect.height * 2.5, 1));

            element.style.setProperty('--eye-x', `${(x * 2.2).toFixed(2)}px`);
            element.style.setProperty('--eye-y', `${(y * 1.8).toFixed(2)}px`);
        };

        const onMove = (event: PointerEvent) => {
            pointer = { x: event.clientX, y: event.clientY };

            if (!frame) {
                frame = requestAnimationFrame(apply);
            }
        };

        window.addEventListener('pointermove', onMove, { passive: true });

        return () => {
            window.removeEventListener('pointermove', onMove);

            if (frame) {
                cancelAnimationFrame(frame);
            }

            element.style.removeProperty('--eye-x');
            element.style.removeProperty('--eye-y');
        };
    }, [ref, enabled]);
}

type EyeKind = 'open' | 'closed' | 'sleepy' | 'up';

function Eye({ cx, cy, kind }: { cx: number; cy: number; kind: EyeKind }) {
    if (kind === 'closed') {
        return <path d={`M${cx - 5} ${cy + 1.5} q5 -6.5 10 0`} fill="none" stroke="var(--mascot-ink)" strokeWidth={2.4} strokeLinecap="round" />;
    }

    const pupilY = kind === 'up' ? cy - 1.6 : cy + 0.4;

    return (
        <g className="mascot-eye" style={{ transformOrigin: `${cx}px ${cy}px` }}>
            <circle cx={cx} cy={cy} r={5.2} fill="#fff" stroke="var(--mascot-ink)" strokeWidth={1.1} />
            <g className="mascot-pupil">
                <circle cx={cx} cy={pupilY} r={2.6} fill="var(--mascot-ink)" />
                <circle cx={cx + 1} cy={pupilY - 1} r={0.8} fill="#fff" />
            </g>
            {kind === 'sleepy' && (
                <path d={`M${cx - 5.2} ${cy} a5.2 5.2 0 0 1 10.4 0 z`} fill="var(--mascot-glass)" stroke="var(--mascot-ink)" strokeWidth={1.1} />
            )}
        </g>
    );
}

function eyeKinds(look: MascotLook, mood: MascotMood): [EyeKind, EyeKind] {
    if (mood === 'thinking') {
        return ['up', 'up'];
    }

    if (mood !== 'happy') {
        return ['open', 'open'];
    }

    switch (look.eyes) {
        case 'smile':
            return ['closed', 'closed'];
        case 'wink':
            return ['open', 'closed'];
        case 'pensive':
            return ['up', 'up'];
        case 'sleepy':
            return ['sleepy', 'sleepy'];
        default:
            return ['open', 'open'];
    }
}

/**
 * The grin of the chase: a wide smile with a row of small white teeth along the upper lip.
 */
function Grin({ id }: { id: string }) {
    const shape = 'M39 65 Q50 79 61 65 Z';

    return (
        <g data-mouth="grin">
            <clipPath id={id}>
                <path d={shape} />
            </clipPath>
            <path d={shape} fill="var(--mascot-mouth)" />
            <rect x={39} y={65} width={22} height={3.4} fill="#fff" clipPath={`url(#${id})`} />
            <path d="M43.4 65v3.4M47.8 65v3.4M52.2 65v3.4M56.6 65v3.4" stroke="var(--mascot-mouth)" strokeWidth={0.7} />
            <path d="M39 65 Q50 79 61 65" fill="none" stroke="var(--mascot-ink)" strokeWidth={1.5} strokeLinecap="round" />
        </g>
    );
}

/**
 * The open jaws of the chase: triangular teeth above and below, and a tongue.
 */
function Jaws() {
    const shape = 'M37 61 Q50 56 63 61 Q64.5 80 50 84 Q35.5 80 37 61 Z';
    const upper = [41.5, 47, 53, 58.5].map((cx, index) => {
        const top = index === 0 || index === 3 ? 60.6 : 59.6;

        return `M${cx - 2.4} ${top} L${cx} ${top + 6} L${cx + 2.4} ${top} Z`;
    });
    const lower = [44, 50, 56].map((cx) => {
        const bottom = cx === 50 ? 82.4 : 80.8;

        return `M${cx - 2.2} ${bottom} L${cx} ${bottom - 5} L${cx + 2.2} ${bottom} Z`;
    });

    return (
        <g data-mouth="jaws">
            <path d={shape} fill="var(--mascot-mouth)" />
            <ellipse cx={50} cy={79} rx={6} ry={3.2} fill="var(--mascot-cheek)" />
            <path d={[...upper, ...lower].join(' ')} fill="#fff" />
            <path d={shape} fill="none" stroke="var(--mascot-ink)" strokeWidth={1.5} strokeLinejoin="round" />
        </g>
    );
}

function Mouth({ mood, id }: { mood: MascotMood; id: string }) {
    const y = FACE.mouthY;

    if (mood === 'sad') {
        return <path d={`M44 ${y + 3} q6 -6 12 0`} fill="none" stroke="var(--mascot-ink)" strokeWidth={2.2} strokeLinecap="round" />;
    }

    if (mood === 'thinking') {
        return <circle cx={52} cy={y + 1} r={1.9} fill="none" stroke="var(--mascot-ink)" strokeWidth={1.8} />;
    }

    if (mood === 'grin') {
        return <Grin id={id} />;
    }

    if (mood === 'jaws') {
        return <Jaws />;
    }

    return <path d={`M44 ${y} q6 6.5 12 0`} fill="none" stroke="var(--mascot-ink)" strokeWidth={2.2} strokeLinecap="round" />;
}

function Brows({ mood }: { mood: MascotMood }) {
    const y = FACE.eyeY - 8.5;

    if (mood === 'grin' || mood === 'jaws') {
        return (
            <g fill="none" stroke="var(--mascot-ink)" strokeWidth={1.8} strokeLinecap="round">
                <path d={`M34.5 ${y - 1} q6 -4.5 12 -1.2`} />
                <path d={`M53.5 ${y - 2.2} q6 -3.3 12 1.2`} />
            </g>
        );
    }

    if (mood === 'sad') {
        return (
            <g fill="none" stroke="var(--mascot-ink)" strokeWidth={1.8} strokeLinecap="round">
                <path d={`M35 ${y} l9 2.2`} />
                <path d={`M65 ${y} l-9 2.2`} />
            </g>
        );
    }

    if (mood === 'thinking') {
        return <path d={`M55 ${y - 1.5} q5 -2.5 9.5 0.5`} fill="none" stroke="var(--mascot-ink)" strokeWidth={1.8} strokeLinecap="round" />;
    }

    return null;
}

/**
 * Both arms: the left one rests (and holds the beads or the book), the right one does the pose.
 */
function Arms({ body, arms, look }: { body: Body; arms: MascotArms; look: MascotLook }) {
    const left = body.x + 1;
    const right = body.x + body.width - 1;
    const shoulderY = 63;
    const stroke = { fill: 'none', stroke: 'var(--mascot-frame)', strokeWidth: 4, strokeLinecap: 'round' as const };
    const hand = { fill: 'var(--mascot-glass)', stroke: 'var(--mascot-frame)', strokeWidth: 2 };

    const leftHand = { x: left - 5, y: shoulderY + 15 };

    let rightArm: React.ReactNode;

    switch (arms) {
        case 'wave':
        case 'farewell':
            rightArm = (
                <g className={arms === 'wave' ? 'mascot-arm-wave' : 'mascot-arm-farewell'} style={{ transformOrigin: `${right}px ${shoulderY}px` }}>
                    <path d={`M${right} ${shoulderY} q9 -6 8 -19`} {...stroke} />
                    <circle cx={right + 8} cy={shoulderY - 20} r={3.4} {...hand} />
                </g>
            );
            break;
        case 'point':
            rightArm = (
                <g className="mascot-arm-point">
                    <path d={`M${right} ${shoulderY + 2} h13`} {...stroke} />
                    <circle cx={right + 14} cy={shoulderY + 2} r={3.4} {...hand} />
                    <path d={`M${right + 17} ${shoulderY + 2} h5`} fill="none" stroke="var(--mascot-frame)" strokeWidth={2.4} strokeLinecap="round" />
                </g>
            );
            break;
        case 'think':
            rightArm = (
                <g>
                    <path d={`M${right} ${shoulderY + 2} q-2 12 -${right - 59} 9`} {...stroke} />
                    <circle cx={58} cy={FACE.mouthY + 7} r={3.4} {...hand} />
                </g>
            );
            break;
        default:
            rightArm = (
                <g>
                    <path d={`M${right} ${shoulderY} q7 6 5 15`} {...stroke} />
                    <circle cx={right + 5} cy={shoulderY + 15} r={3.4} {...hand} />
                </g>
            );
    }

    return (
        <>
            <g>
                <path d={`M${left} ${shoulderY} q-7 6 -5 15`} {...stroke} />
                <circle cx={leftHand.x} cy={leftHand.y} r={3.4} {...hand} />
                {look.accessory === 'beads' && (
                    <path
                        d={`M${leftHand.x - 1} ${leftHand.y + 3} q-3 10 6 13 q8 2 9 -6`}
                        fill="none"
                        stroke="var(--mascot-halo)"
                        strokeWidth={2.8}
                        strokeLinecap="round"
                        strokeDasharray="0.1 3.4"
                    />
                )}
                {look.accessory === 'book' && (
                    <g transform={`translate(${leftHand.x - 7} ${leftHand.y + 1})`}>
                        <rect width={12} height={10} rx={1.4} fill="var(--color-primary-700, #16634e)" stroke="var(--mascot-frame)" strokeWidth={1} />
                        <path d="M3 0v10" stroke="var(--color-gold-400, #d8a747)" strokeWidth={1} />
                        <path d="M5.5 3h4.5M5.5 5.5h4.5" stroke="var(--color-gold-300, #e1bd6c)" strokeWidth={0.8} strokeLinecap="round" />
                    </g>
                )}
            </g>
            {rightArm}
        </>
    );
}

function Sparkle({ x, y, size = 3 }: { x: number; y: number; size?: number }) {
    const s = size;
    const t = size / 3;

    return (
        <path
            className="mascot-sparkle"
            d={`M${x} ${y - s} L${x + t} ${y - t} L${x + s} ${y} L${x + t} ${y + t} L${x} ${y + s} L${x - t} ${y + t} L${x - s} ${y} L${x - t} ${y - t} Z`}
            fill="var(--mascot-halo)"
            style={{ transformOrigin: `${x}px ${y}px` }}
        />
    );
}

/**
 * The face of the companion: a lantern of light drawn in SVG, whose look (halo, body, eyes, accessory),
 * arms and mood change with the props. No image: everything is code, so the page can change it at will.
 */
export function MascotFace({ look, arms = 'rest', mood = 'happy', size = '4rem', mirrorArms = false, track = false, animate = true, className, style }: MascotFaceProps) {
    const ref = useRef<SVGSVGElement>(null);
    const id = `mascot-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const body = BODIES[look.body];
    const [leftEye, rightEye] = eyeKinds(look, mood);
    const top = body.y;
    const bottom = body.y + body.height;

    useEyeTracking(ref, track && animate);

    return (
        <svg
            ref={ref}
            viewBox="0 0 100 120"
            className={cn('mascot', animate && 'mascot-animated', className)}
            data-halo={look.halo}
            data-mood={mood}
            style={{ height: size, ...style }}
            aria-hidden
        >
            <g className="mascot-halo" fill="var(--mascot-halo)">
                <circle cx={50} cy={60} r={46} opacity={0.14} />
                <circle cx={50} cy={60} r={36} opacity={0.16} />
            </g>

            {look.accessory === 'crescent' && (
                <path d={`M70 ${top - 15} a7.5 7.5 0 1 0 2 14.6 a5.8 5.8 0 1 1 -2 -14.6 z`} fill="var(--mascot-halo)" />
            )}
            {look.accessory === 'sparkles' && (
                <g>
                    <Sparkle x={13} y={40} />
                    <Sparkle x={89} y={32} size={2.4} />
                    <Sparkle x={86} y={98} size={2.2} />
                </g>
            )}

            <g className="mascot-body">
                <circle cx={50} cy={top - 13} r={3.6} fill="none" stroke="var(--mascot-frame)" strokeWidth={2.2} />
                <path d={`M36 ${top + 1} Q50 ${top - 12} 64 ${top + 1} Z`} fill="var(--mascot-frame)" />
                <rect x={body.x} y={body.y} width={body.width} height={body.height} rx={body.rx} fill="var(--mascot-glass)" stroke="var(--mascot-frame)" strokeWidth={2.5} />
                <ellipse cx={50} cy={60} rx={body.width * 0.36} ry={body.height * 0.34} fill="var(--mascot-halo)" opacity={0.26} />
                <rect x={38} y={bottom - 1} width={24} height={7} rx={2.5} fill="var(--mascot-frame)" />
            </g>

            <g className="mascot-face">
                <circle cx={FACE.leftEye - 5} cy={FACE.cheekY} r={3.4} fill="var(--mascot-cheek)" opacity={0.5} />
                <circle cx={FACE.rightEye + 5} cy={FACE.cheekY} r={3.4} fill="var(--mascot-cheek)" opacity={0.5} />
                <Brows mood={mood} />
                <Eye cx={FACE.leftEye} cy={FACE.eyeY} kind={leftEye} />
                <Eye cx={FACE.rightEye} cy={FACE.eyeY} kind={rightEye} />
                <Mouth mood={mood} id={id} />
                {mood === 'sad' && (
                    <path
                        className="mascot-tear"
                        d={`M${FACE.leftEye - 4} ${FACE.eyeY + 6.5} q-2.4 3.4 0 5.4 q2.4 -2 0 -5.4 z`}
                        fill="var(--color-sky-400, #38bdf8)"
                        opacity={0.9}
                    />
                )}
            </g>

            <g className="mascot-arms" transform={mirrorArms ? 'translate(100 0) scale(-1 1)' : undefined}>
                <Arms body={body} arms={arms} look={look} />
            </g>
        </svg>
    );
}
