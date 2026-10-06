import { useId } from 'react';

/**
 * Sizes of the frame of a page (in pixels): the gap to the edge of the paper, the ornamented band,
 * and where the inside of the frame starts.
 */
export function frameMetrics(width: number): { outer: number; band: number; inner: number } {
    const narrow = width < 420;
    const outer = Math.round(width * (narrow ? 0.018 : 0.022));
    const band = Math.max(7, Math.round(width * (narrow ? 0.024 : 0.03)));

    return { outer, band, inner: outer + band + Math.max(3, Math.round(width * 0.008)) };
}

/**
 * Tile of the band: a gold lozenge on the band color, joined to the next tiles.
 */
function Tile() {
    return (
        <>
            <rect width="10" height="10" className="fill-(--frame-band)" />
            <path d="M5 1.2 8.8 5 5 8.8 1.2 5Z" className="fill-(--frame-ornament)" />
            <path d="M5 3.1 6.9 5 5 6.9 3.1 5Z" className="fill-(--frame-band)" />
            <circle cx="5" cy="5" r="0.75" className="fill-(--frame-ornament)" />
            {[
                [0, 5],
                [10, 5],
                [5, 0],
                [5, 10],
            ].map(([x, y]) => (
                <circle key={`${x}-${y}`} cx={x} cy={y} r="0.8" className="fill-(--frame-ornament)" />
            ))}
        </>
    );
}

/**
 * Corner of the band: an eight-pointed star.
 */
function Corner({ x, y, size }: { x: number; y: number; size: number }) {
    return (
        <svg x={x} y={y} width={size} height={size} viewBox="0 0 10 10">
            <rect width="10" height="10" className="fill-(--frame-band)" />
            <path d="M2.3 2.3h5.4v5.4H2.3Z" className="fill-(--frame-ornament)" />
            <path d="M5 1.2 8.8 5 5 8.8 1.2 5Z" className="fill-(--frame-ornament)" />
            <circle cx="5" cy="5" r="1.7" className="fill-(--frame-band)" />
            <circle cx="5" cy="5" r="0.7" className="fill-(--frame-ornament)" />
        </svg>
    );
}

/**
 * The frame of a mushaf page, drawn at the size of the page: a band of gold lozenges between gold
 * lines, with stars at the corners. Its colors come from the paper (light and dark mode).
 */
export function MushafFrame({ width, height, className }: { width: number; height: number; className?: string }) {
    const id = useId().replace(/:/g, '');
    const { outer, band, inner } = frameMetrics(width);
    const across = width - 2 * outer - 2 * band;
    const down = height - 2 * outer - 2 * band;

    if (across <= 0 || down <= 0) {
        return null;
    }

    // Every side has a whole number of tiles, so the pattern ends cleanly at the corners.
    const tileAcross = across / Math.max(1, Math.round(across / band));
    const tileDown = down / Math.max(1, Math.round(down / band));
    const line = Math.max(0.8, width / 600);

    const sides = [
        { key: 'top', x: outer + band, y: outer, w: across, h: band, tw: tileAcross, th: band },
        { key: 'bottom', x: outer + band, y: height - outer - band, w: across, h: band, tw: tileAcross, th: band },
        { key: 'right', x: width - outer - band, y: outer + band, w: band, h: down, tw: band, th: tileDown },
        { key: 'left', x: outer, y: outer + band, w: band, h: down, tw: band, th: tileDown },
    ];

    return (
        <svg className={className} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <defs>
                {sides.map((side) => (
                    <pattern key={side.key} id={`${id}-${side.key}`} patternUnits="userSpaceOnUse" x={side.x} y={side.y} width={side.tw} height={side.th} viewBox="0 0 10 10" preserveAspectRatio="none">
                        <Tile />
                    </pattern>
                ))}
            </defs>

            {sides.map((side) => (
                <rect key={side.key} x={side.x} y={side.y} width={side.w} height={side.h} fill={`url(#${id}-${side.key})`} />
            ))}

            <Corner x={outer} y={outer} size={band} />
            <Corner x={width - outer - band} y={outer} size={band} />
            <Corner x={outer} y={height - outer - band} size={band} />
            <Corner x={width - outer - band} y={height - outer - band} size={band} />

            <g fill="none" className="stroke-(--frame-line)">
                <rect x={outer - line * 1.5} y={outer - line * 1.5} width={width - 2 * outer + line * 3} height={height - 2 * outer + line * 3} rx={line * 2} strokeWidth={line} />
                <rect x={outer} y={outer} width={width - 2 * outer} height={height - 2 * outer} strokeWidth={line * 0.8} />
                <rect x={outer + band} y={outer + band} width={across} height={down} strokeWidth={line * 0.8} />
                <rect x={inner - line} y={inner - line} width={width - 2 * inner + 2 * line} height={height - 2 * inner + 2 * line} strokeWidth={line * 0.6} />
            </g>
        </svg>
    );
}
