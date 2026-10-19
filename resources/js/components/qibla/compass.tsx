import { CircleCheck } from 'lucide-react';
import { useId, useState } from 'react';
import { useTrans } from '@/lib/i18n';
import { angleDifference, compassLetters, isFacingQibla } from '@/lib/qibla';
import { cn } from '@/lib/utils';

const SIZE = 360;
const CENTER = SIZE / 2;
const RADIUS = 140;

/** A tick every 5°; longer every 30° and longest at the cardinal points. */
const tickAngles = Array.from({ length: 72 }, (_, index) => index * 5);

/** Degrees printed between the letters. */
const numberAngles = [30, 60, 120, 150, 210, 240, 300, 330];

interface QiblaCompassProps {
    /** Where the top of the phone points, clockwise from north; null without a compass sensor. */
    heading: number | null;
    /** The qibla, clockwise from north; null while the location is unknown. */
    bearing: number | null;
    className?: string;
}

/**
 * The dial turns against the phone's heading so north stays true; the gold arrow and the Kaaba on
 * the rim mark the qibla. The fixed mark at the top is where the phone points: when the Kaaba sits
 * under it, the user faces the qibla and the dial glows.
 */
export function QiblaCompass({ heading, bearing, className }: QiblaCompassProps) {
    const { t, locale } = useTrans();
    const id = useId();
    const rotation = useContinuousRotation(heading === null ? 0 : -heading);
    const aligned = isFacingQibla(heading, bearing);
    const letters = compassLetters[locale];
    const glow = aligned ? `url(#${id}-glow)` : undefined;

    return (
        <div className={cn('relative mx-auto w-full max-w-88', className)}>
            {aligned && <span aria-hidden className="absolute inset-5 animate-pulse rounded-full ring-8 ring-gold-400/30" />}

            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={t('Qibla compass')} className="relative block w-full select-none">
                <defs>
                    <filter id={`${id}-glow`} x="-25%" y="-25%" width="150%" height="150%">
                        <feGaussianBlur stdDeviation="7" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>

                <g className="origin-[180px_180px] transition-transform duration-200 ease-out motion-reduce:transition-none" style={{ transform: `rotate(${rotation}deg)` }}>
                    <circle
                        cx={CENTER}
                        cy={CENTER}
                        r={RADIUS}
                        className={cn('fill-canvas transition-[stroke] duration-300 dark:fill-surface-muted', aligned ? 'stroke-gold-500' : 'stroke-line-strong')}
                        strokeWidth={aligned ? 4 : 2}
                        filter={glow}
                    />
                    <circle cx={CENTER} cy={CENTER} r={RADIUS - 46} className="fill-none stroke-line" strokeWidth={1} />

                    {tickAngles.map((angle) => {
                        const cardinal = angle % 90 === 0;
                        const major = angle % 30 === 0;

                        return (
                            <line
                                key={angle}
                                x1={CENTER}
                                y1={CENTER - RADIUS + 4}
                                x2={CENTER}
                                y2={CENTER - RADIUS + (cardinal ? 18 : major ? 13 : 8)}
                                transform={`rotate(${angle} ${CENTER} ${CENTER})`}
                                className={cardinal ? 'stroke-ink' : 'stroke-line-strong'}
                                strokeWidth={cardinal ? 2.5 : 1.5}
                                strokeLinecap="round"
                            />
                        );
                    })}

                    {numberAngles.map((angle) => (
                        <text
                            key={angle}
                            x={CENTER}
                            y={CENTER - RADIUS + 36}
                            transform={`rotate(${angle} ${CENTER} ${CENTER})`}
                            textAnchor="middle"
                            fontSize="11"
                            className="fill-muted tabular-nums"
                        >
                            {angle}
                        </text>
                    ))}

                    {letters.map((letter, index) => (
                        <text
                            key={letter}
                            x={CENTER}
                            y={CENTER - RADIUS + 40}
                            transform={`rotate(${index * 90} ${CENTER} ${CENTER})`}
                            textAnchor="middle"
                            fontSize="22"
                            fontWeight="700"
                            className={index === 0 ? 'fill-primary-600 dark:fill-primary-400' : 'fill-ink'}
                        >
                            {letter}
                        </text>
                    ))}

                    {/* The needle: its coloured half points north. */}
                    <polygon points={`${CENTER},${CENTER - 84} ${CENTER - 7},${CENTER} ${CENTER + 7},${CENTER}`} className="fill-primary-600 dark:fill-primary-400" />
                    <polygon points={`${CENTER},${CENTER + 84} ${CENTER - 7},${CENTER} ${CENTER + 7},${CENTER}`} className="fill-stone-300 dark:fill-stone-600" />

                    {bearing !== null && (
                        <g transform={`rotate(${bearing} ${CENTER} ${CENTER})`} filter={glow}>
                            <line x1={CENTER} y1={CENTER} x2={CENTER} y2={CENTER - 74} className="stroke-gold-500" strokeWidth={5} strokeLinecap="round" />
                            <polygon points={`${CENTER},${CENTER - 92} ${CENTER - 11},${CENTER - 70} ${CENTER + 11},${CENTER - 70}`} className="fill-gold-500" />
                            <g transform={`translate(${CENTER} ${CENTER - RADIUS - 14})`}>
                                <rect x={-9} y={-9} width={18} height={18} rx={3} className="fill-stone-900 stroke-gold-400" strokeWidth={1.5} />
                                <rect x={-9} y={-4} width={18} height={4} className="fill-gold-400" />
                            </g>
                        </g>
                    )}
                </g>

                {/* Fixed parts: where the phone points, and the pivot. */}
                {heading !== null && <polygon points={`${CENTER},14 ${CENTER - 8},2 ${CENTER + 8},2`} className={aligned ? 'fill-gold-500' : 'fill-ink'} />}
                <circle cx={CENTER} cy={CENTER} r={8} className="fill-surface stroke-line-strong" strokeWidth={2} />
                <circle cx={CENTER} cy={CENTER} r={3} className={aligned ? 'fill-gold-500' : 'fill-ink'} />
            </svg>

            {aligned && (
                <p className="absolute inset-x-0 bottom-1 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-700 px-3 py-1 text-xs font-bold text-white shadow-lg shadow-primary-900/20 dark:bg-primary-500">
                        <CircleCheck className="size-3.5" />
                        {t('You are facing the qibla')}
                    </span>
                </p>
            )}
        </div>
    );
}

/**
 * Keep the rotation continuous so a step from 359° to 1° turns 2°, not a full lap backwards.
 */
function useContinuousRotation(target: number): number {
    const [state, setState] = useState({ target, rotation: target });

    if (state.target !== target) {
        setState({ target, rotation: state.rotation + angleDifference(state.target, target) });
    }

    return state.rotation;
}
