import { localized, type Localized } from '@/lib/prayers';
import type { Locale } from '@/types';

export type CardOccasion =
    | 'eid-fitr'
    | 'eid-adha'
    | 'ramadan'
    | 'hijri-year'
    | 'hajj'
    | 'qadr'
    | 'jumuah'
    | 'khatm'
    | 'graduation'
    | 'general'
    | 'academy';

export type CardRatio = 'portrait' | 'square';

/** The shape the photo is clipped into; "none" fills the top of the card with the photo. */
export type CardFrame = 'arch' | 'circle' | 'oval' | 'rounded' | 'star' | 'none';

export type CardMotif =
    | 'crescent'
    | 'stars'
    | 'lanterns'
    | 'mosque'
    | 'corners'
    | 'border'
    | 'rays'
    | 'kaaba'
    | 'ribbon'
    | 'pattern'
    | 'lattice';

export interface CardPalette {
    /** Top of the background gradient. */
    background: string;
    /** Bottom of the background gradient. */
    backgroundEnd: string;
    /** Ribbons and panels. */
    primary: string;
    /** Ornaments, borders, the pattern and the photo frame. */
    accent: string;
    /** The occasion title. */
    title: string;
    /** The name and the message. */
    text: string;
}

export interface CardTemplate {
    id: string;
    occasion: CardOccasion;
    name: Localized;
    ratio: CardRatio;
    palette: CardPalette;
    frame: CardFrame;
    motifs: CardMotif[];
    defaultTitle: Localized;
    defaultMessage: Localized;
    /** The academy or platform logo is shown unless the user hides it. */
    showLogo?: boolean;
}

/**
 * What the user composes on top of a template; the photo and the logo are data URLs so the export stays self-contained.
 */
export interface CardDesign {
    title: string;
    name: string;
    message: string;
    photo: string | null;
    zoom: number;
    /** Pan of the photo in card units (the card is 1080 wide). */
    offsetX: number;
    offsetY: number;
    showLogo: boolean;
}

export const cardOccasions: { id: CardOccasion; name: Localized }[] = [
    { id: 'eid-fitr', name: { ar: 'عيد الفطر', en: 'Eid al-Fitr' } },
    { id: 'eid-adha', name: { ar: 'عيد الأضحى', en: 'Eid al-Adha' } },
    { id: 'ramadan', name: { ar: 'رمضان', en: 'Ramadan' } },
    { id: 'hijri-year', name: { ar: 'العام الهجري', en: 'Hijri New Year' } },
    { id: 'hajj', name: { ar: 'الحج', en: 'Hajj' } },
    { id: 'qadr', name: { ar: 'ليلة القدر', en: 'Laylat al-Qadr' } },
    { id: 'jumuah', name: { ar: 'الجمعة', en: "Jumu'ah" } },
    { id: 'khatm', name: { ar: 'ختم القرآن', en: 'Quran completion' } },
    { id: 'graduation', name: { ar: 'التخرّج', en: 'Graduation' } },
    { id: 'general', name: { ar: 'تهنئة عامة', en: 'General greeting' } },
    { id: 'academy', name: { ar: 'من الأكاديمية', en: 'From the academy' } },
];

const gold = '#d8a747';
const cream = '#fbf3e1';

export const cardTemplates: CardTemplate[] = [
    {
        id: 'eid-fitr-emerald',
        occasion: 'eid-fitr',
        name: { ar: 'عيد الفطر · زمرّدي وذهبي', en: 'Eid al-Fitr · Emerald & gold' },
        ratio: 'portrait',
        palette: { background: '#0f5b48', backgroundEnd: '#052a21', primary: '#0b3b31', accent: gold, title: '#f1c866', text: cream },
        frame: 'arch',
        motifs: ['pattern', 'lanterns', 'crescent', 'corners', 'border'],
        defaultTitle: { ar: 'عيد فطر مبارك', en: 'Eid al-Fitr Mubarak' },
        defaultMessage: { ar: 'كل عام وأنتم بخير، تقبّل الله منا ومنكم صالح الأعمال', en: 'Eid Mubarak! May Allah accept our good deeds and yours.' },
    },
    {
        id: 'eid-fitr-night',
        occasion: 'eid-fitr',
        name: { ar: 'عيد الفطر · ليلة العيد', en: 'Eid al-Fitr · Eid night' },
        ratio: 'portrait',
        palette: { background: '#0d1b3d', backgroundEnd: '#050b1f', primary: '#16306b', accent: '#e1bd6c', title: '#f0cf7a', text: '#f5f1e6' },
        frame: 'circle',
        motifs: ['stars', 'crescent', 'mosque', 'corners', 'border'],
        defaultTitle: { ar: 'عيد مبارك', en: 'Eid Mubarak' },
        defaultMessage: { ar: 'أعاده الله عليكم بالخير واليمن والبركات', en: 'May Allah bring it back to you with goodness and blessings.' },
    },
    {
        id: 'eid-fitr-sand',
        occasion: 'eid-fitr',
        name: { ar: 'عيد الفطر · رملي', en: 'Eid al-Fitr · Sand' },
        ratio: 'square',
        palette: { background: '#f8ecd3', backgroundEnd: '#e2c184', primary: '#b8893b', accent: '#8b5422', title: '#6e3f14', text: '#3b2412' },
        frame: 'star',
        motifs: ['crescent', 'lanterns', 'corners', 'border'],
        defaultTitle: { ar: 'كل عام وأنتم بخير', en: 'Eid Mubarak' },
        defaultMessage: { ar: 'عيد فطر مبارك، جعله الله عيد فرح وقبول', en: 'A blessed Eid al-Fitr; may Allah make it an Eid of joy and acceptance.' },
    },
    {
        id: 'eid-adha-maroon',
        occasion: 'eid-adha',
        name: { ar: 'عيد الأضحى · عنّابي وكريمي', en: 'Eid al-Adha · Maroon & cream' },
        ratio: 'square',
        palette: { background: '#6b1a2c', backgroundEnd: '#3a0b16', primary: '#8a2439', accent: '#f1e3c6', title: '#f6e3b8', text: '#fff7ea' },
        frame: 'rounded',
        motifs: ['lattice', 'crescent', 'corners', 'border'],
        defaultTitle: { ar: 'عيد أضحى مبارك', en: 'Eid al-Adha Mubarak' },
        defaultMessage: { ar: 'تقبّل الله طاعتكم وأضحيتكم، وكل عام وأنتم بخير', en: 'May Allah accept your worship and your sacrifice. Eid Mubarak!' },
    },
    {
        id: 'eid-adha-desert',
        occasion: 'eid-adha',
        name: { ar: 'عيد الأضحى · رمال الصحراء', en: 'Eid al-Adha · Desert sands' },
        ratio: 'portrait',
        palette: { background: '#f3d9a4', backgroundEnd: '#c97b45', primary: '#8a3b1c', accent: '#7a3a16', title: '#5a2410', text: '#3b1b0d' },
        frame: 'star',
        motifs: ['rays', 'stars', 'corners', 'border'],
        defaultTitle: { ar: 'كل عام وأنتم بخير', en: 'Eid Mubarak' },
        defaultMessage: { ar: 'عيد أضحى مبارك، أعاده الله علينا وعليكم بالخير والبركة', en: 'A blessed Eid al-Adha; may Allah return it to us and you with goodness.' },
    },
    {
        id: 'ramadan-lanterns',
        occasion: 'ramadan',
        name: { ar: 'رمضان كريم · فوانيس', en: 'Ramadan Kareem · Lanterns' },
        ratio: 'portrait',
        palette: { background: '#141f55', backgroundEnd: '#070f2b', primary: '#1c2a6b', accent: '#e3b64f', title: '#f0c75e', text: '#f7f1e3' },
        frame: 'arch',
        motifs: ['stars', 'pattern', 'lanterns', 'crescent', 'border'],
        defaultTitle: { ar: 'رمضان كريم', en: 'Ramadan Kareem' },
        defaultMessage: { ar: 'بلّغنا الله وإياكم صيامه وقيامه، وتقبّل منا ومنكم', en: 'May Allah let us reach its fasting and its prayers, and accept them from us and you.' },
    },
    {
        id: 'ramadan-welcome',
        occasion: 'ramadan',
        name: { ar: 'أهلًا رمضان · فيروزي ورملي', en: 'Welcome Ramadan · Teal & sand' },
        ratio: 'square',
        palette: { background: '#146b78', backgroundEnd: '#083c45', primary: '#0f5f6b', accent: '#e8d2a5', title: '#f3deb0', text: '#f8f3ea' },
        frame: 'oval',
        motifs: ['lattice', 'crescent', 'mosque', 'border'],
        defaultTitle: { ar: 'أهلًا رمضان', en: 'Welcome Ramadan' },
        defaultMessage: { ar: 'مبارك عليكم الشهر الكريم، جعله الله شهر خير وبركة', en: 'Blessed be the noble month; may Allah make it a month of goodness and blessing.' },
    },
    {
        id: 'hijri-night',
        occasion: 'hijri-year',
        name: { ar: 'عام هجري · سماء الليل', en: 'Hijri New Year · Night sky' },
        ratio: 'portrait',
        palette: { background: '#1a1446', backgroundEnd: '#070a1f', primary: '#241c5c', accent: gold, title: '#e8c36a', text: '#efe9ff' },
        frame: 'arch',
        motifs: ['stars', 'pattern', 'crescent', 'corners', 'border'],
        defaultTitle: { ar: 'عام هجري سعيد', en: 'Happy Hijri New Year' },
        defaultMessage: { ar: 'كل عام وأنتم إلى الله أقرب، وعلى طاعته أدوم', en: 'May every year find you closer to Allah and firmer in His obedience.' },
    },
    {
        id: 'muharram-emerald',
        occasion: 'hijri-year',
        name: { ar: 'محرّم · زمرّدي', en: 'Muharram · Emerald' },
        ratio: 'square',
        palette: { background: '#0a4a3a', backgroundEnd: '#062e24', primary: '#0b3b31', accent: gold, title: '#f1c866', text: cream },
        frame: 'rounded',
        motifs: ['pattern', 'mosque', 'crescent', 'corners', 'border'],
        defaultTitle: { ar: 'عام هجري جديد', en: 'Happy Muharram' },
        defaultMessage: { ar: 'جعله الله عام خير ونصر وبركة على الأمة', en: 'May Allah make it a year of goodness, victory and blessing for the Ummah.' },
    },
    {
        id: 'hajj-mabrour',
        occasion: 'hajj',
        name: { ar: 'حج مبرور · ذهب الصحراء', en: 'Hajj Mabrour · Desert gold' },
        ratio: 'portrait',
        palette: { background: '#f7e7c6', backgroundEnd: '#d9a066', primary: '#9a5a2b', accent: '#7a3e1a', title: '#5a2a0e', text: '#3b2412' },
        frame: 'rounded',
        motifs: ['lattice', 'rays', 'kaaba', 'corners', 'border'],
        defaultTitle: { ar: 'حج مبرور', en: 'Hajj Mabrour' },
        defaultMessage: { ar: 'حجًا مبرورًا وسعيًا مشكورًا وذنبًا مغفورًا', en: 'An accepted Hajj, an appreciated effort, and forgiven sins.' },
    },
    {
        id: 'laylat-qadr',
        occasion: 'qadr',
        name: { ar: 'ليلة القدر · نجوم', en: 'Laylat al-Qadr · Stars' },
        ratio: 'portrait',
        palette: { background: '#0f1b4d', backgroundEnd: '#04081c', primary: '#172566', accent: '#f0d27a', title: '#f5dd8a', text: '#eef0ff' },
        frame: 'circle',
        motifs: ['stars', 'rays', 'mosque', 'crescent', 'border'],
        defaultTitle: { ar: 'ليلة القدر خير من ألف شهر', en: 'Laylat al-Qadr' },
        defaultMessage: { ar: 'اللهم إنك عفو تحب العفو فاعف عنا', en: 'O Allah, You are Forgiving and love forgiveness, so forgive us.' },
    },
    {
        id: 'jumuah-white',
        occasion: 'jumuah',
        name: { ar: 'جمعة مباركة · أبيض وأخضر', en: "Jumu'ah Mubarak · White & green" },
        ratio: 'square',
        palette: { background: '#ffffff', backgroundEnd: '#dff3ea', primary: '#d8f3e6', accent: '#1b7c60', title: '#16634e', text: '#1b2a25' },
        frame: 'oval',
        motifs: ['pattern', 'mosque', 'corners', 'border'],
        defaultTitle: { ar: 'جمعة مباركة', en: "Jumu'ah Mubarak" },
        defaultMessage: { ar: 'أكثروا من الصلاة على النبي ﷺ في هذا اليوم المبارك', en: 'Send abundant blessings upon the Prophet ﷺ on this blessed day.' },
    },
    {
        id: 'khatm-quran',
        occasion: 'khatm',
        name: { ar: 'ختم القرآن · زمرّدي وذهبي', en: 'Quran completion · Emerald & gold' },
        ratio: 'portrait',
        palette: { background: '#124136', backgroundEnd: '#08251e', primary: '#0b3b31', accent: gold, title: '#efc461', text: cream },
        frame: 'arch',
        motifs: ['pattern', 'stars', 'ribbon', 'corners', 'border'],
        defaultTitle: { ar: 'مبارك ختم القرآن', en: 'Congratulations on completing the Quran' },
        defaultMessage: { ar: 'جعله الله حجة لك ورفعك به في الدنيا والآخرة', en: 'May Allah make it a witness for you and raise you by it in this life and the next.' },
    },
    {
        id: 'halaqa-graduation',
        occasion: 'graduation',
        name: { ar: 'تخرّج الحلقة · كحلي وذهبي', en: 'Halaqa graduation · Navy & gold' },
        ratio: 'portrait',
        palette: { background: '#1a2f6b', backgroundEnd: '#0b1535', primary: '#13245a', accent: gold, title: '#f0cf7a', text: '#f5f1e6' },
        frame: 'rounded',
        motifs: ['lattice', 'stars', 'ribbon', 'corners', 'border'],
        defaultTitle: { ar: 'مبارك التخرّج', en: 'Congratulations, graduate!' },
        defaultMessage: { ar: 'أتممت حفظك بتوفيق الله، فهنيئًا لك وبارك الله في علمك', en: 'You completed your memorization by the grace of Allah; congratulations, and may Allah bless your knowledge.' },
    },
    {
        id: 'general-teal',
        occasion: 'general',
        name: { ar: 'تهنئة · فيروزي وكريمي', en: 'Greeting · Teal & cream' },
        ratio: 'square',
        palette: { background: '#0f5f6b', backgroundEnd: '#0a3f48', primary: '#146b78', accent: '#f1e3c6', title: '#f6e7c7', text: '#f8f3ea' },
        frame: 'circle',
        motifs: ['pattern', 'corners', 'border'],
        defaultTitle: { ar: 'تهنئة', en: 'Congratulations' },
        defaultMessage: { ar: 'أسأل الله أن يبارك لكم ويديم عليكم الفرح والسرور', en: 'May Allah bless you and keep joy and happiness with you always.' },
    },
    {
        id: 'academy-eid',
        occasion: 'academy',
        name: { ar: 'تهنئة الأكاديمية بالعيد', en: 'Eid greeting from the academy' },
        ratio: 'portrait',
        palette: { background: '#ffffff', backgroundEnd: '#eef7f2', primary: '#d8f3e6', accent: '#c98f2f', title: '#16634e', text: '#1b2a25' },
        frame: 'none',
        motifs: ['pattern', 'crescent', 'corners', 'border'],
        defaultTitle: { ar: 'عيد مبارك', en: 'Eid Mubarak' },
        defaultMessage: { ar: 'تهنئكم أسرة الأكاديمية بالعيد السعيد، وكل عام وأنتم بخير', en: 'The academy family wishes you a blessed and happy Eid.' },
        showLogo: true,
    },
];

export function templateById(id: string): CardTemplate {
    return cardTemplates.find((template) => template.id === id) ?? cardTemplates[0];
}

export interface CardBox {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface CardLayout {
    width: number;
    height: number;
    /** Distance of the inner border from the edge. */
    inset: number;
    frame: CardBox;
    title: { y: number; size: number; maxWidth: number };
    name: { y: number; size: number; maxWidth: number };
    message: { y: number; size: number; lineHeight: number; maxWidth: number; maxLines: number };
    logo: { size: number; y: number; margin: number; textSize: number };
    crescent: { x: number; y: number; r: number };
    lanterns: { xs: number[]; top: number; scale: number };
    mosque: { baseY: number; scale: number };
    kaaba: { x: number; y: number; size: number };
}

export function cardSize(ratio: CardRatio): { width: number; height: number } {
    return { width: 1080, height: ratio === 'portrait' ? 1350 : 1080 };
}

/**
 * Where everything sits on the card, in its 1080-wide coordinate system.
 */
export function cardLayout(template: CardTemplate): CardLayout {
    const { width, height } = cardSize(template.ratio);
    const inset = 52;
    const full = template.frame === 'none';

    if (template.ratio === 'portrait') {
        return {
            width,
            height,
            inset,
            frame: full ? { x: inset, y: inset, w: width - inset * 2, h: 830 } : { x: 200, y: 140, w: 680, h: 720 },
            title: { y: 995, size: 92, maxWidth: 940 },
            name: { y: 1088, size: 58, maxWidth: 900 },
            message: { y: 1166, size: 40, lineHeight: 56, maxWidth: 760, maxLines: 2 },
            logo: { size: 84, y: 1204, margin: 76, textSize: 26 },
            crescent: { x: 910, y: 185, r: 95 },
            lanterns: { xs: [112, 968], top: inset, scale: 1 },
            mosque: { baseY: height - inset, scale: 1 },
            kaaba: { x: 540, y: 62, size: 66 },
        };
    }

    return {
        width,
        height,
        inset,
        frame: full ? { x: inset, y: inset, w: width - inset * 2, h: 640 } : { x: 270, y: 110, w: 540, h: 540 },
        title: { y: 782, size: 84, maxWidth: 900 },
        name: { y: 862, size: 52, maxWidth: 860 },
        message: { y: 932, size: 36, lineHeight: 50, maxWidth: 700, maxLines: 2 },
        logo: { size: 64, y: 950, margin: 76, textSize: 22 },
        crescent: { x: 905, y: 150, r: 80 },
        lanterns: { xs: [120, 960], top: inset, scale: 0.85 },
        mosque: { baseY: height - inset, scale: 0.85 },
        kaaba: { x: 540, y: 54, size: 50 },
    };
}

/**
 * The sixteen corners of an eight-pointed star (two overlapping squares).
 */
export function starPoints(cx: number, cy: number, outer: number): [number, number][] {
    const inner = (outer * Math.SQRT1_2) / Math.cos(Math.PI / 8);

    return Array.from({ length: 16 }, (_, index) => {
        const angle = (Math.PI / 8) * index - Math.PI / 2;
        const radius = index % 2 === 0 ? outer : inner;

        return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    });
}

export function polygonPath(points: [number, number][]): string {
    return `${points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${round(x)} ${round(y)}`).join('')}Z`;
}

export function roundedRectPath({ x, y, w, h }: CardBox, r: number): string {
    return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
}

/**
 * The path the photo is clipped with and the frame is drawn along.
 */
export function framePath(frame: CardFrame, box: CardBox): string {
    const { x, y, w, h } = box;
    const cx = x + w / 2;
    const cy = y + h / 2;

    switch (frame) {
        case 'circle': {
            const r = Math.min(w, h) / 2;

            return `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
        }
        case 'oval': {
            const rx = w / 2;
            const ry = h / 2;

            return `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;
        }
        case 'rounded':
            return roundedRectPath(box, 56);
        case 'star':
            return polygonPath(starPoints(cx, cy, Math.min(w, h) / 2));
        case 'arch': {
            // A two-centred pointed arch: each side is an arc whose centre sits on the springing line.
            const r = w * 0.55;
            const rise = Math.sqrt(r * r - (w / 2 - r) ** 2);
            const spring = round(y + rise);

            return `M${x} ${y + h}V${spring}A${round(r)} ${round(r)} 0 0 1 ${cx} ${y}A${round(r)} ${round(r)} 0 0 1 ${x + w} ${spring}V${y + h}Z`;
        }
        default:
            return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
    }
}

export interface CardTextLine {
    text: string;
    x: number;
    y: number;
    size: number;
    weight: 400 | 700;
    fill: string;
    anchor: 'start' | 'middle' | 'end';
    direction: 'rtl' | 'ltr';
    shadow: boolean;
    opacity?: number;
}

export function textDirection(text: string): 'rtl' | 'ltr' {
    return /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/.test(text) ? 'rtl' : 'ltr';
}

/**
 * Rough advance of a string in Amiri, enough to shrink and wrap the lines the same way in the SVG and on the canvas.
 */
export function estimateTextWidth(text: string, size: number): number {
    let width = 0;

    for (const char of text) {
        if (char === ' ') {
            width += 0.25;
        } else if (/[ً-ٰٟۖ-ۭ]/.test(char)) {
            width += 0;
        } else if (/[؀-ۿﭐ-﷿ﹰ-﻿]/.test(char)) {
            width += 0.52;
        } else if (/[A-Z]/.test(char)) {
            width += 0.68;
        } else {
            width += 0.55;
        }
    }

    return width * size;
}

function fitSize(text: string, size: number, maxWidth: number, minSize: number): number {
    const width = estimateTextWidth(text, size);

    return width <= maxWidth ? size : Math.max(minSize, Math.floor((size * maxWidth) / width));
}

function wrapWords(text: string, size: number, maxWidth: number): string[] {
    const lines: string[] = [];

    for (const paragraph of text.split('\n')) {
        let current = '';

        for (const word of paragraph.split(/\s+/).filter(Boolean)) {
            const candidate = current ? `${current} ${word}` : word;

            if (!current || estimateTextWidth(candidate, size) <= maxWidth) {
                current = candidate;
            } else {
                lines.push(current);
                current = word;
            }
        }

        if (current) {
            lines.push(current);
        }
    }

    return lines;
}

/**
 * Wrap a message into at most a few lines, shrinking the font when the text is long.
 */
export function wrapText(text: string, size: number, maxWidth: number, maxLines: number): { lines: string[]; size: number } {
    let current = size;
    let lines = wrapWords(text, current, maxWidth);

    while (current > 22 && (lines.length > maxLines || lines.some((line) => estimateTextWidth(line, current) > maxWidth))) {
        current -= 2;
        lines = wrapWords(text, current, maxWidth);
    }

    if (lines.length > maxLines) {
        lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
    }

    return { lines, size: current };
}

export interface LogoPlacement {
    x: number;
    y: number;
    size: number;
    captionX: number;
    captionY: number;
    /** Arabic cards keep the logo at the end (right) corner, English cards at the left one. */
    atRight: boolean;
}

export function logoPlacement(layout: CardLayout, locale: Locale): LogoPlacement {
    const { size, y, margin, textSize } = layout.logo;
    const atRight = locale === 'ar';
    const x = atRight ? layout.width - margin - size : margin;

    return {
        x,
        y,
        size,
        captionX: atRight ? x - 18 : x + size + 18,
        captionY: y + size / 2 + textSize * 0.35,
        atRight,
    };
}

/**
 * Every text of the card with its position, so the preview (SVG) and the export (canvas) draw the same lines.
 */
export function cardTextLines(template: CardTemplate, design: CardDesign, logoName: string | null, locale: Locale): CardTextLine[] {
    const layout = cardLayout(template);
    const { palette } = template;
    const centre = layout.width / 2;
    const lines: CardTextLine[] = [];

    const title = design.title.trim();
    const name = design.name.trim();
    const message = design.message.trim();

    if (title) {
        lines.push({
            text: title,
            x: centre,
            y: layout.title.y,
            size: fitSize(title, layout.title.size, layout.title.maxWidth, 40),
            weight: 700,
            fill: palette.title,
            anchor: 'middle',
            direction: textDirection(title),
            shadow: true,
        });
    }

    if (name) {
        lines.push({
            text: name,
            x: centre,
            y: layout.name.y,
            size: fitSize(name, layout.name.size, layout.name.maxWidth, 30),
            weight: 700,
            fill: palette.text,
            anchor: 'middle',
            direction: textDirection(name),
            shadow: true,
        });
    }

    if (message) {
        const wrapped = wrapText(message, layout.message.size, layout.message.maxWidth, layout.message.maxLines);
        const direction = textDirection(message);

        wrapped.lines.forEach((line, index) => {
            lines.push({
                text: line,
                x: centre,
                y: layout.message.y + index * (layout.message.lineHeight * (wrapped.size / layout.message.size)),
                size: wrapped.size,
                weight: 400,
                fill: palette.text,
                anchor: 'middle',
                direction,
                shadow: false,
                opacity: 0.92,
            });
        });
    }

    if (design.showLogo && logoName) {
        const placement = logoPlacement(layout, locale);
        const direction = textDirection(logoName);
        const caption = logoName.trim();
        const maxWidth = layout.width / 2 - layout.logo.margin - layout.logo.size - 40;

        lines.push({
            text: caption,
            x: placement.captionX,
            y: placement.captionY,
            size: fitSize(caption, layout.logo.textSize, maxWidth, 16),
            weight: 700,
            fill: palette.text,
            // The caption hangs off the logo: its edge next to the logo stays fixed whatever the script.
            anchor: placement.atRight === (direction === 'rtl') ? 'start' : 'end',
            direction,
            shadow: false,
            opacity: 0.85,
        });
    }

    return lines;
}

export function localizedTemplateTexts(template: CardTemplate, locale: Locale): { title: string; message: string } {
    return { title: localized(template.defaultTitle, locale), message: localized(template.defaultMessage, locale) };
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}
