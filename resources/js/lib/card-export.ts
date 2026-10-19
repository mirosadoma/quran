import type { CardTextLine } from '@/lib/cards';

/**
 * Read a file chosen by the user as a data URL (nothing leaves the browser).
 */
export function fileToDataUrl(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error ?? new Error('The file could not be read.'));
        reader.readAsDataURL(file);
    });
}

function loadImage(source: string, anonymous = false): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();

        if (anonymous) {
            image.crossOrigin = 'anonymous';
        }

        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('The image could not be loaded.'));
        image.src = source;
    });
}

/**
 * Scale a photo down so the preview stays fast and the card small; returns a JPEG data URL.
 */
export async function shrinkImage(source: string, maxSide = 1600): Promise<string> {
    const image = await loadImage(source);
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight, 1));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');

    if (!context) {
        return source;
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.92);
}

export async function readPhoto(file: File): Promise<string> {
    return shrinkImage(await fileToDataUrl(file));
}

/**
 * Fetch an image of the site (an avatar or a logo) as a data URL so the SVG export can embed it.
 * Falls back to a canvas when the server answers without CORS headers; throws when the browser blocks that too.
 */
export async function urlToDataUrl(url: string): Promise<string> {
    try {
        const response = await fetch(url, { mode: 'cors', credentials: 'same-origin' });

        if (!response.ok) {
            throw new Error(response.statusText);
        }

        const blob = await response.blob();

        if (!blob.type.startsWith('image/')) {
            throw new Error('Not an image.');
        }

        return await fileToDataUrl(blob);
    } catch {
        const image = await loadImage(url, true);
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');

        if (!context) {
            throw new Error('Canvas is not supported.');
        }

        context.drawImage(image, 0, 0);

        return canvas.toDataURL('image/png');
    }
}

/**
 * The SVG without its text layer, serialized for drawing on a canvas.
 */
function svgSource(svg: SVGSVGElement, width: number, height: number): string {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll('[data-layer="text"]').forEach((layer) => layer.remove());
    clone.removeAttribute('class');
    clone.removeAttribute('style');
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));

    return new XMLSerializer().serializeToString(clone);
}

async function loadSvgImage(source: string): Promise<HTMLImageElement> {
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    try {
        return await loadImage(url);
    } catch {
        // Some browsers refuse blob URLs for SVG images; a data URL always works.
        return loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`);
    } finally {
        URL.revokeObjectURL(url);
    }
}

function canvasFont(line: CardTextLine): string {
    return `${line.weight} ${line.size}px Amiri, serif`;
}

async function loadFonts(lines: CardTextLine[]): Promise<void> {
    if (!('fonts' in document)) {
        return;
    }

    const fonts = new Set(lines.map((line) => `${line.weight} 32px Amiri`));

    try {
        await Promise.all([...fonts].map((font) => document.fonts.load(font)));
    } catch {
        // The fallback serif is used when Amiri is not available.
    }
}

function drawLine(context: CanvasRenderingContext2D, line: CardTextLine): void {
    context.save();
    context.font = canvasFont(line);
    context.direction = line.direction;
    context.textAlign = line.anchor === 'middle' ? 'center' : line.anchor;
    context.textBaseline = 'alphabetic';
    context.fillStyle = line.fill;
    context.globalAlpha = line.opacity ?? 1;

    if (line.shadow) {
        context.shadowColor = 'rgba(0, 0, 0, 0.35)';
        context.shadowBlur = 8;
        context.shadowOffsetY = 3;
    }

    context.fillText(line.text, line.x, line.y);
    context.restore();
}

/**
 * Build the PNG: the SVG (background, photo, ornaments) drawn on a canvas, then the texts drawn with the Amiri font,
 * which an SVG rendered as an image would lose.
 */
export async function renderCardPng(svg: SVGSVGElement, lines: CardTextLine[], width: number, height: number): Promise<Blob> {
    const [image] = await Promise.all([loadSvgImage(svgSource(svg, width, height)), loadFonts(lines)]);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Canvas is not supported.');
    }

    context.drawImage(image, 0, 0, width, height);

    for (const line of lines) {
        drawLine(context, line);
    }

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('The PNG could not be created.'))), 'image/png');
    });
}

export function downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/**
 * Share the PNG with the Web Share API where files are supported, otherwise download it.
 */
export async function shareBlob(blob: Blob, fileName: string, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
    const file = new File([blob], fileName, { type: 'image/png' });

    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title });

            return 'shared';
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                return 'cancelled';
            }
        }
    }

    downloadBlob(blob, fileName);

    return 'downloaded';
}
