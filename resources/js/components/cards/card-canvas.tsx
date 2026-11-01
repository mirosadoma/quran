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
    /** Called with the drag distance in card units and the photo dragged; enables dragging the photos. */
    onPan?: (dx: number, dy: number, layer: CardLayer) => void;
    /** Called with how much two fingers spread apart (above 1) or came together; enables pinching the photos. */
    onZoom?: (factor: number, layer: CardLayer) => void;
}

/** The photo in the frame, or the second photo placed over the card. */
export type CardLayer = 'photo' | 'overlay';

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
export function CardCanvas({ template, design, logo = null, locale, className, svgRef, onPan, onZoom }: CardCanvasProps) {
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
    // The fingers (or the mouse) on a photo: one drags it; two drag it by their middle and zoom it by their spread.
    // The second photo moves when the first finger lands on it, otherwise the photo in the frame.
    const pointers = useRef(new Map<number, { x: number; y: number }>());
    const spread = useRef<number | null>(null);
    const layer = useRef<CardLayer>('photo');
    const pannable = Boolean(onPan && (design.photo || design.overlay));

    const spreadOf = (): number | null => {
        const [a, b] = [...pointers.current.values()];

        return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null;
    };

    const middleOf = (): { x: number; y: number } => {
        const points = [...pointers.current.values()].slice(0, 2);

        return { x: points.reduce((sum, point) => sum + point.x, 0) / points.length, y: points.reduce((sum, point) => sum + point.y, 0) / points.length };
    };

    const startDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
        if (!pannable) {
            return;
        }

        if (pointers.current.size === 0) {
            const onOverlay = event.target instanceof Element && event.target.closest('[data-layer="overlay"]') !== null;

            layer.current = onOverlay || !design.photo ? 'overlay' : 'photo';
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        spread.current = spreadOf();
    };

    const moveDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
        if (!pointers.current.has(event.pointerId) || !onPan) {
            return;
        }

        const scale = width / event.currentTarget.getBoundingClientRect().width;
        const before = middleOf();
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const after = middleOf();
        onPan((after.x - before.x) * scale, (after.y - before.y) * scale, layer.current);

        const now = spreadOf();

        if (now !== null && spread.current) {
            onZoom?.(now / spread.current, layer.current);
        }

        spread.current = now;
    };

    const endDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
        pointers.current.delete(event.pointerId);
        spread.current = spreadOf();
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
            {has('rosette') && <Rosette cx={cx} cy={cy} r={Math.max(frame.w, frame.h) * 0.74} color={palette.accent} />}
            {has('confetti') && <Confetti width={width} height={height} palette={palette} />}
            {has('mosque') && <Mosque layout={layout} color={palette.accent} />}
            {has('dunes') && <Dunes width={width} height={height} palette={palette} />}

            <g clipPath={`url(#${id}-clip)`}>
                {design.photo ? (
                    <g
                        transform={`translate(${cx + design.offsetX} ${cy + design.offsetY}) rotate(${design.rotation}) scale(${design.zoom}) translate(${-cx} ${-cy})`}
                        opacity={design.opacity}
                    >
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
            {has('bunting') && <Bunting width={width} inset={layout.inset} palette={palette} />}
            {has('flowers') && <Flowers width={width} height={height} palette={palette} />}

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

            {design.overlay && (
                <g
                    data-layer="overlay"
                    transform={`translate(${design.overlay.x} ${design.overlay.y}) rotate(${design.overlay.rotation})`}
                    opacity={design.overlay.opacity}
                    style={pannable ? { cursor: 'move' } : undefined}
                >
                    <image
                        href={design.overlay.photo}
                        x={-design.overlay.size / 2}
                        y={-design.overlay.size / 2}
                        width={design.overlay.size}
                        height={design.overlay.size}
                        preserveAspectRatio="xMidYMid meet"
                    />
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

/**
 * A large faint eight-pointed rosette behind the photo: two stars, the second turned, inside two rings.
 */
function Rosette({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
    return (
        <g fill="none" stroke={color} opacity={0.22} strokeLinejoin="round">
            <path d={polygonPath(starPoints(cx, cy, r))} strokeWidth={4} />
            <path d={polygonPath(starPoints(cx, cy, r * 0.86))} strokeWidth={2} transform={`rotate(22.5 ${cx} ${cy})`} />
            <circle cx={cx} cy={cy} r={r * 1.04} strokeWidth={2} />
            <circle cx={cx} cy={cy} r={r * 1.1} strokeWidth={1} strokeDasharray="6 10" />
        </g>
    );
}

/** Confetti around the edges: x and y as fractions of the card, the turn, the shape (0 strip, 1 dot) and the colour. */
const confettiField: [number, number, number, number, number][] = [
    [0.07, 0.05, 20, 0, 0],
    [0.16, 0.1, -35, 1, 1],
    [0.25, 0.04, 60, 0, 2],
    [0.36, 0.08, -15, 0, 3],
    [0.47, 0.03, 40, 1, 0],
    [0.58, 0.09, -50, 0, 1],
    [0.68, 0.04, 15, 0, 2],
    [0.78, 0.1, -25, 1, 3],
    [0.88, 0.05, 70, 0, 0],
    [0.95, 0.13, -10, 0, 1],
    [0.04, 0.2, 45, 0, 2],
    [0.09, 0.33, -60, 1, 3],
    [0.05, 0.47, 25, 0, 0],
    [0.1, 0.6, -30, 0, 1],
    [0.94, 0.25, 35, 1, 2],
    [0.9, 0.38, -45, 0, 3],
    [0.95, 0.5, 10, 0, 0],
    [0.91, 0.62, -70, 1, 1],
];

function Confetti({ width, height, palette }: { width: number; height: number; palette: CardPalette }) {
    const colors = [palette.accent, palette.title, palette.text, palette.primary];

    return (
        <g opacity={0.85}>
            {confettiField.map(([fx, fy, turn, shape, color], index) => {
                const x = Math.round(fx * width);
                const y = Math.round(fy * height);

                return shape === 1 ? (
                    <circle key={index} cx={x} cy={y} r={7} fill={colors[color]} />
                ) : (
                    <rect key={index} x={x - 13} y={y - 5} width={26} height={10} rx={3} fill={colors[color]} transform={`rotate(${turn} ${x} ${y})`} />
                );
            })}
        </g>
    );
}

/**
 * Two rows of dunes (or waves) at the bottom of the card, faint behind the texts.
 */
function Dunes({ width, height, palette }: { width: number; height: number; palette: CardPalette }) {
    const top = height - 300;

    return (
        <g>
            <path
                d={`M0 ${top + 60}C${width * 0.2} ${top} ${width * 0.35} ${top + 110} ${width * 0.55} ${top + 70}S${width * 0.85} ${top + 10} ${width} ${top + 50}V${height}H0Z`}
                fill={palette.primary}
                opacity={0.22}
            />
            <path
                d={`M0 ${top + 150}C${width * 0.25} ${top + 90} ${width * 0.45} ${top + 190} ${width * 0.7} ${top + 140}S${width * 0.92} ${top + 110} ${width} ${top + 140}V${height}H0Z`}
                fill={palette.accent}
                opacity={0.14}
            />
        </g>
    );
}

/**
 * Pennants hung on a string across the top of the card, in the colours of the design.
 */
function Bunting({ width, inset, palette }: { width: number; inset: number; palette: CardPalette }) {
    const colors = [palette.accent, palette.title, palette.primary];
    const left = inset + 10;
    const right = width - inset - 10;
    const top = inset + 14;
    const sag = 26;
    const count = 13;
    const y = (t: number) => top + sag * 4 * t * (1 - t);

    return (
        <g>
            <path d={`M${left} ${top}Q${width / 2} ${top + sag * 2} ${right} ${top}`} fill="none" stroke={palette.accent} strokeWidth={3} />
            {Array.from({ length: count }, (_, index) => {
                const t = (index + 0.5) / count;
                const x = left + (right - left) * t;
                const at = y(t);
                const half = 24;

                return (
                    <path
                        key={index}
                        d={`M${round(x - half)} ${round(at)}L${round(x + half)} ${round(at)}L${round(x)} ${round(at + 54)}Z`}
                        fill={colors[index % colors.length]}
                        stroke={palette.background}
                        strokeWidth={2}
                        opacity={0.95}
                    />
                );
            })}
        </g>
    );
}

/**
 * A flower with eight petals, two leaves and a heart, set in each corner of the card.
 */
function Flowers({ width, height, palette }: { width: number; height: number; palette: CardPalette }) {
    const flower = (x: number, y: number, size: number, turn: number) => (
        <g transform={`translate(${x} ${y}) rotate(${turn}) scale(${size})`}>
            <path d="M0 0C-30 -10 -60 10 -70 40C-40 40 -15 25 0 0Z" fill={palette.primary} opacity={0.85} />
            <path d="M0 0C10 30 40 55 70 55C65 25 40 5 0 0Z" fill={palette.primary} opacity={0.7} />
            {Array.from({ length: 8 }, (_, index) => (
                <ellipse key={index} cx={0} cy={-26} rx={13} ry={26} fill={palette.title} opacity={0.75} transform={`rotate(${index * 45})`} />
            ))}
            <circle r={13} fill={palette.accent} />
            <circle r={6} fill={palette.background} opacity={0.6} />
        </g>
    );

    return (
        <g>
            {flower(98, 98, 1, 0)}
            {flower(width - 98, 98, 1, 90)}
            {flower(98, height - 98, 0.9, -90)}
            {flower(width - 98, height - 98, 0.9, 180)}
            {flower(190, 70, 0.45, 30)}
            {flower(width - 190, 70, 0.45, -30)}
        </g>
    );
}

function round(value: number): number {
    return Math.round(value * 10) / 10;
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
