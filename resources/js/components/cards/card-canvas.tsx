import { type PointerEvent as ReactPointerEvent, type Ref, useId, useRef } from 'react';
import {
    type CardBox,
    type CardDesign,
    type CardLayout,
    type CardMotif,
    type CardPalette,
    type CardTemplate,
    cardLayout,
    cardTextLines,
    framePath,
    logoPlacement,
    polygonPath,
    starPoints,
} from '@/lib/cards';
import type { Locale } from '@/types';

export interface CardLogo {
    /** A data URL, so the exported PNG can embed it; null falls back to the brand mark. */
    image: string | null;
    name: string;
}

interface CardCanvasProps {
    template: CardTemplate;
    design: CardDesign;
    logo?: CardLogo | null;
    locale: Locale;
    className?: string;
    svgRef?: Ref<SVGSVGElement>;
    /** Called with the drag distance in card units; enables dragging the photo. */
    onPan?: (dx: number, dy: number) => void;
}

const PATTERN_SIZE = 120;

/** Stars of the night sky: x and y as fractions of the card, then the size. */
const starField: [number, number, number][] = [
    [0.06, 0.07, 9],
    [0.13, 0.16, 5],
    [0.2, 0.06, 6],
    [0.3, 0.12, 4],
    [0.42, 0.05, 7],
    [0.5, 0.1, 4],
    [0.6, 0.06, 5],
    [0.7, 0.13, 8],
    [0.8, 0.05, 5],
    [0.9, 0.17, 6],
    [0.95, 0.08, 4],
    [0.08, 0.3, 4],
    [0.93, 0.33, 5],
    [0.05, 0.45, 6],
    [0.95, 0.5, 4],
    [0.1, 0.58, 5],
    [0.9, 0.62, 7],
];

/**
 * One greeting card as a self-contained SVG (no CSS classes inside), 1080 units wide.
 * The texts sit in a group marked data-layer="text" so the export can redraw them with the Amiri font.
 */
export function CardCanvas({ template, design, logo = null, locale, className, svgRef, onPan }: CardCanvasProps) {
    const id = `card-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const layout = cardLayout(template);
    const { width, height, frame } = layout;
    const { palette } = template;
    const has = (motif: CardMotif): boolean => template.motifs.includes(motif);
    const clip = framePath(template.frame, frame);
    const cx = frame.x + frame.w / 2;
    const cy = frame.y + frame.h / 2;
    const showLogo = design.showLogo && logo !== null;
    const lines = cardTextLines(template, design, showLogo ? logo.name : null, locale);
    const drag = useRef<{ x: number; y: number } | null>(null);
    const pannable = Boolean(onPan && design.photo);

    const startDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
        if (!pannable) {
            return;
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { x: event.clientX, y: event.clientY };
    };

    const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
        if (!drag.current || !onPan) {
            return;
        }

        const scale = width / event.currentTarget.getBoundingClientRect().width;
        onPan((event.clientX - drag.current.x) * scale, (event.clientY - drag.current.y) * scale);
        drag.current = { x: event.clientX, y: event.clientY };
    };

    const endDrag = () => {
        drag.current = null;
    };

    return (
        <svg
            ref={svgRef}
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${width} ${height}`}
            className={className}
            style={{ aspectRatio: `${width} / ${height}`, touchAction: pannable ? 'none' : undefined, cursor: pannable ? 'grab' : undefined }}
            role="img"
            aria-label={design.title}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
        >
            <defs>
                <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0.4" y2="1">
                    <stop offset="0" stopColor={palette.background} />
                    <stop offset="1" stopColor={palette.backgroundEnd} />
                </linearGradient>
                <pattern id={`${id}-pattern`} width={PATTERN_SIZE} height={PATTERN_SIZE} patternUnits="userSpaceOnUse">
                    <path d={has('lattice') ? latticeTile(PATTERN_SIZE) : starTile(PATTERN_SIZE)} fill="none" stroke={palette.accent} strokeWidth={1.5} />
                </pattern>
                <clipPath id={`${id}-clip`}>
                    <path d={clip} />
                </clipPath>
                <clipPath id={`${id}-logo`}>
                    <rect x={0} y={0} width={layout.logo.size} height={layout.logo.size} rx={layout.logo.size * 0.22} />
                </clipPath>
                <filter id={`${id}-shadow`} x="-10%" y="-30%" width="120%" height="170%">
                    <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000000" floodOpacity="0.35" />
                </filter>
                <radialGradient id={`${id}-rays`} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={760}>
                    <stop offset="0.3" stopColor={palette.accent} stopOpacity="0.3" />
                    <stop offset="1" stopColor={palette.accent} stopOpacity="0" />
                </radialGradient>
                <linearGradient id={`${id}-lantern`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={palette.title} stopOpacity="0.95" />
                    <stop offset="1" stopColor={palette.accent} stopOpacity="0.55" />
                </linearGradient>
                <g id={`${id}-corner`} fill="none" stroke={palette.accent} strokeLinecap="round">
                    <path d="M64 230C64 130 130 64 230 64" strokeWidth={3} />
                    <path d="M64 170C64 110 110 64 170 64" strokeWidth={1.5} opacity={0.7} />
                    <path d={polygonPath(starPoints(118, 118, 20))} fill={palette.accent} stroke="none" />
                    <circle cx={230} cy={64} r={5} fill={palette.accent} stroke="none" />
                    <circle cx={64} cy={230} r={5} fill={palette.accent} stroke="none" />
                </g>
            </defs>

            <rect width={width} height={height} fill={`url(#${id}-bg)`} />
            {(has('pattern') || has('lattice')) && <rect width={width} height={height} fill={`url(#${id}-pattern)`} opacity={0.11} />}

            {has('stars') && <Stars width={width} height={height} color={palette.accent} />}
            {has('rays') && <Rays id={id} cx={cx} cy={cy} />}
            {has('mosque') && <Mosque layout={layout} color={palette.accent} />}

            <g clipPath={`url(#${id}-clip)`}>
                {design.photo ? (
                    <g transform={`translate(${cx + design.offsetX} ${cy + design.offsetY}) scale(${design.zoom}) translate(${-cx} ${-cy})`}>
                        <image href={design.photo} x={frame.x} y={frame.y} width={frame.w} height={frame.h} preserveAspectRatio="xMidYMid slice" />
                    </g>
                ) : (
                    <Placeholder box={frame} color={palette.accent} />
                )}
            </g>
            <path d={clip} fill="none" stroke={palette.accent} strokeWidth={22} opacity={0.18} />
            <path d={clip} fill="none" stroke={palette.accent} strokeWidth={10} strokeLinejoin="round" />
            {template.frame !== 'none' && (
                <path
                    d={clip}
                    fill="none"
                    stroke={palette.accent}
                    strokeWidth={2}
                    opacity={0.8}
                    strokeLinejoin="round"
                    transform={`translate(${cx} ${cy}) scale(1.045) translate(${-cx} ${-cy})`}
                />
            )}

            {has('lanterns') && layout.lanterns.xs.map((x) => <Lantern key={x} id={id} x={x} top={layout.lanterns.top} scale={layout.lanterns.scale} palette={palette} />)}
            {has('crescent') && <Crescent layout={layout} palette={palette} />}
            {has('kaaba') && template.frame !== 'none' && <Kaaba layout={layout} color={palette.accent} />}
            {has('ribbon') && <Ribbon layout={layout} palette={palette} />}

            {has('border') && (
                <g fill="none" stroke={palette.accent}>
                    <rect x={36} y={36} width={width - 72} height={height - 72} strokeWidth={3} />
                    <rect x={layout.inset} y={layout.inset} width={width - layout.inset * 2} height={height - layout.inset * 2} strokeWidth={1.5} opacity={0.6} />
                </g>
            )}
            {has('corners') && (
                <g>
                    <use href={`#${id}-corner`} />
                    <use href={`#${id}-corner`} transform={`translate(${width} 0) scale(-1 1)`} />
                    <use href={`#${id}-corner`} transform={`translate(0 ${height}) scale(1 -1)`} />
                    <use href={`#${id}-corner`} transform={`translate(${width} ${height}) scale(-1 -1)`} />
                </g>
            )}

            {showLogo && <Logo id={id} layout={layout} locale={locale} logo={logo} />}

            <g data-layer="text">
                {lines.map((line, index) => (
                    <text
                        key={index}
                        x={line.x}
                        y={line.y}
                        fontFamily="'Amiri', serif"
                        fontSize={line.size}
                        fontWeight={line.weight}
                        fill={line.fill}
                        textAnchor={line.anchor}
                        direction={line.direction}
                        opacity={line.opacity}
                        filter={line.shadow ? `url(#${id}-shadow)` : undefined}
                    >
                        {line.text}
                    </text>
                ))}
            </g>
        </svg>
    );
}

/**
 * Eight-pointed stars joined by lines (the brand pattern).
 */
function starTile(size: number): string {
    const c = size / 2;
    const h = size * 0.2;
    const d = h * Math.SQRT2;
    const k = size * 0.14;

    return [
        `M${c - h} ${c - h}H${c + h}V${c + h}H${c - h}Z`,
        `M${c} ${c - d}L${c + d} ${c}L${c} ${c + d}L${c - d} ${c}Z`,
        `M${c} 0V${c - d}M${c} ${c + d}V${size}M0 ${c}H${c - d}M${c + d} ${c}H${size}`,
        `M0 ${k}L${k} 0M${size - k} 0L${size} ${k}M${size} ${size - k}L${size - k} ${size}M${k} ${size}L0 ${size - k}`,
    ].join('');
}

/**
 * Interlaced diamonds.
 */
function latticeTile(size: number): string {
    const c = size / 2;
    const q = size * 0.18;

    return [
        `M0 ${c}L${c} 0L${size} ${c}L${c} ${size}Z`,
        `M${c - q} ${c}L${c} ${c - q}L${c + q} ${c}L${c} ${c + q}Z`,
        `M0 0L${q} ${q}M${size} 0L${size - q} ${q}M${size} ${size}L${size - q} ${size - q}M0 ${size}L${q} ${size - q}`,
    ].join('');
}

function Stars({ width, height, color }: { width: number; height: number; color: string }) {
    return (
        <g fill={color}>
            {starField.map(([fx, fy, size], index) => {
                const x = Math.round(fx * width);
                const y = Math.round(fy * height);

                return index % 3 === 2 ? (
                    <circle key={index} cx={x} cy={y} r={size * 0.35} opacity={0.7} />
                ) : (
                    <path
                        key={index}
                        d={`M${x} ${y - size}Q${x} ${y} ${x + size} ${y}Q${x} ${y} ${x} ${y + size}Q${x} ${y} ${x - size} ${y}Q${x} ${y} ${x} ${y - size}Z`}
                        opacity={0.55 + (index % 4) * 0.1}
                    />
                );
            })}
        </g>
    );
}

function Rays({ id, cx, cy }: { id: string; cx: number; cy: number }) {
    return (
        <g stroke={`url(#${id}-rays)`} strokeWidth={16} strokeLinecap="round">
            {Array.from({ length: 24 }, (_, index) => {
                const angle = (Math.PI * 2 * index) / 24 + Math.PI / 24;

                return <line key={index} x1={cx} y1={cy} x2={Math.round(cx + Math.cos(angle) * 760)} y2={Math.round(cy + Math.sin(angle) * 760)} />;
            })}
        </g>
    );
}

/**
 * A mosque skyline, faint, behind the texts at the bottom of the card.
 */
function Mosque({ layout, color }: { layout: CardLayout; color: string }) {
    const { scale, baseY } = layout.mosque;
    const path =
        'M0 0H92V-330A18 18 0 0 1 128 -330V0H160V-110H220V-30A70 70 0 0 1 360 -30V-110H390V-60A150 150 0 0 1 690 -60V-110H720V-30A70 70 0 0 1 860 -30V-110H920V0H952V-330A18 18 0 0 1 988 -330V0H1080V40H0Z';

    return (
        <g transform={`translate(${(layout.width * (1 - scale)) / 2} ${baseY}) scale(${scale})`} fill={color} opacity={0.16}>
            <path d={path} />
            <rect x={537} y={-262} width={6} height={52} />
            <circle cx={540} cy={-268} r={9} />
            <rect x={104} y={-205} width={32} height={10} />
            <rect x={964} y={-205} width={32} height={10} />
        </g>
    );
}

/**
 * A soft silhouette shown until the user adds a photo.
 */
function Placeholder({ box, color }: { box: CardBox; color: string }) {
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    const head = Math.min(box.w, box.h) * 0.17;

    return (
        <g fill={color}>
            <rect x={box.x} y={box.y} width={box.w} height={box.h} opacity={0.16} />
            <circle cx={cx} cy={cy - box.h * 0.1} r={head} opacity={0.35} />
            <path
                d={`M${cx - box.w * 0.36} ${box.y + box.h}C${cx - box.w * 0.36} ${cy + box.h * 0.1} ${cx + box.w * 0.36} ${cy + box.h * 0.1} ${cx + box.w * 0.36} ${box.y + box.h}Z`}
                opacity={0.35}
            />
        </g>
    );
}

/**
 * A crescent badge on a disc of the card's colour: the crescent is a circle minus a circle, drawn as two arcs, tilted.
 */
function Crescent({ layout, palette }: { layout: CardLayout; palette: CardPalette }) {
    const { x, y, r } = layout.crescent;
    const inner = r * 1.25;

    return (
        <g transform={`translate(${x} ${y})`}>
            <circle r={r * 1.22} fill={palette.background} opacity={0.85} />
            <circle r={r * 1.22} fill="none" stroke={palette.accent} strokeWidth={3} opacity={0.9} />
            <g transform="rotate(-32)">
                <path d={`M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${inner} ${inner} 0 0 0 0 ${-r}Z`} fill={palette.accent} />
            </g>
            <path d={polygonPath(starPoints(r * 0.42, -r * 0.1, r * 0.2))} fill={palette.title} />
        </g>
    );
}

function Lantern({ id, x, top, scale, palette }: { id: string; x: number; top: number; scale: number; palette: CardPalette }) {
    return (
        <g transform={`translate(${x} ${top}) scale(${scale})`}>
            <line x1={0} y1={0} x2={0} y2={70} stroke={palette.accent} strokeWidth={3} />
            <circle cx={0} cy={72} r={6} fill={palette.accent} />
            <path d="M-20 80H20L30 100H-30Z" fill={palette.accent} />
            <path d="M-30 100H30L40 150L30 215H-30L-40 150Z" fill={palette.accent} />
            <path d="M-22 108H22L30 150L22 207H-22L-30 150Z" fill={`url(#${id}-lantern)`} />
            <g stroke={palette.accent} strokeWidth={2} opacity={0.8}>
                <line x1={-11} y1={108} x2={-15} y2={207} />
                <line x1={0} y1={108} x2={0} y2={207} />
                <line x1={11} y1={108} x2={15} y2={207} />
            </g>
            <path d="M-26 215H26L18 236H-18Z" fill={palette.accent} />
            <circle cx={0} cy={246} r={8} fill={palette.accent} />
        </g>
    );
}

function Kaaba({ layout, color }: { layout: CardLayout; color: string }) {
    const { x, y, size } = layout.kaaba;

    return (
        <g transform={`translate(${x - size / 2} ${y})`}>
            <rect width={size} height={size * 0.95} rx={4} fill="#151515" />
            <rect y={size * 0.22} width={size} height={size * 0.13} fill={color} />
            <rect x={size * 0.62} y={size * 0.5} width={size * 0.2} height={size * 0.45} fill={color} opacity={0.85} />
        </g>
    );
}

/**
 * A banner behind the title.
 */
function Ribbon({ layout, palette }: { layout: CardLayout; palette: CardPalette }) {
    const { y, size } = layout.title;
    const top = y - size * 0.95;
    const h = size * 1.4;
    const left = 140;
    const right = layout.width - 140;
    const notch = 40;

    return (
        <path
            d={`M${left} ${top}H${right}L${right - notch} ${top + h / 2}L${right} ${top + h}H${left}L${left + notch} ${top + h / 2}Z`}
            fill={palette.primary}
            stroke={palette.accent}
            strokeWidth={3}
            strokeLinejoin="round"
        />
    );
}

function Logo({ id, layout, locale, logo }: { id: string; layout: CardLayout; locale: Locale; logo: CardLogo }) {
    const { x, y, size } = logoPlacement(layout, locale);
    const pad = size * 0.1;

    return (
        <g transform={`translate(${x} ${y})`}>
            <rect width={size} height={size} rx={size * 0.22} fill="#ffffff" opacity={0.94} />
            {logo.image ? (
                <image href={logo.image} x={pad} y={pad} width={size - pad * 2} height={size - pad * 2} preserveAspectRatio="xMidYMid meet" clipPath={`url(#${id}-logo)`} />
            ) : (
                <g transform={`scale(${size / 48})`}>
                    <rect width={48} height={48} rx={14} fill="#0b3b31" />
                    <g fill="none" stroke="#d8a747" strokeWidth={1.8} strokeLinejoin="round">
                        <rect x={12.5} y={12.5} width={23} height={23} rx={1.5} />
                        <rect x={12.5} y={12.5} width={23} height={23} rx={1.5} transform="rotate(45 24 24)" />
                    </g>
                    <path d="M24 21.4c-2-1.5-4.3-1.8-6.6-1V28c2.3-.8 4.6-.5 6.6 1z" fill="#ecd7a1" />
                    <path d="M24 21.4c2-1.5 4.3-1.8 6.6-1V28c-2.3-.8-4.6-.5-6.6 1z" fill="#f6ecd2" />
                </g>
            )}
        </g>
    );
}
