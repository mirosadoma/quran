import { usePage } from '@inertiajs/react';
import { Camera, Copy, Download, ImagePlus, Move, Palette, RotateCcw, RotateCw, Share2, Trash2, UserRound } from 'lucide-react';
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CardCanvas, type CardLayer, type CardLogo } from '@/components/cards/card-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input, Switch, Textarea } from '@/components/ui/form';
import { downloadBlob, readPhoto, renderCardPng, shareBlob, shrinkImage, urlToDataUrl } from '@/lib/card-export';
import { type CardDesign, type CardOverlay, type CardTemplate, cardSize, cardTextLines, localizedTemplateTexts } from '@/lib/cards';
import { useTrans } from '@/lib/i18n';
import { cn, formatNumber } from '@/lib/utils';

export interface CardDefaults {
    name: string;
    avatar_url: string | null;
    academy: { name: string; logo_url: string | null } | null;
}

interface CardEditorProps {
    template: CardTemplate;
    defaults: CardDefaults;
}

/**
 * What the user changed; null keeps the template's (or the profile's) default.
 */
interface Edits {
    title: string | null;
    name: string | null;
    message: string | null;
    photo: string | null;
    zoom: number;
    offsetX: number;
    offsetY: number;
    rotation: number;
    opacity: number;
    overlay: CardOverlay | null;
    showLogo: boolean | null;
}

const photoDefaults = { zoom: 1, offsetX: 0, offsetY: 0, rotation: 0, opacity: 1 };
const initialEdits: Edits = { title: null, name: null, message: null, photo: null, ...photoDefaults, overlay: null, showLogo: null };
const PAN_LIMIT = 700;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const OPACITY_MIN = 0.1;
/** Width of the second photo, in card units. */
const OVERLAY_MIN = 80;
const OVERLAY_MAX = 1200;

/** A turn kept between -180 and 180 degrees. */
function turned(degrees: number): number {
    return ((((degrees + 180) % 360) + 360) % 360) - 180;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

/**
 * The live preview with the photo, text and logo controls; nothing is sent to the server.
 */
export function CardEditor({ template, defaults }: CardEditorProps) {
    const { t, locale } = useTrans();
    const { app } = usePage().props;
    const svgRef = useRef<SVGSVGElement>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const overlayInput = useRef<HTMLInputElement>(null);
    const [edits, setEdits] = useState<Edits>(initialEdits);
    const [busy, setBusy] = useState<'photo' | 'export' | null>(null);
    const [logoImage, setLogoImage] = useState<string | null>(null);
    const [logoFailed, setLogoFailed] = useState(false);

    const brand = defaults.academy ?? { name: app.name, logo_url: app.logo_url };
    const texts = localizedTemplateTexts(template, locale);
    const design: CardDesign = {
        title: edits.title ?? texts.title,
        name: edits.name ?? defaults.name,
        message: edits.message ?? texts.message,
        photo: edits.photo,
        zoom: edits.zoom,
        offsetX: edits.offsetX,
        offsetY: edits.offsetY,
        rotation: edits.rotation,
        opacity: edits.opacity,
        overlay: edits.overlay,
        showLogo: edits.showLogo ?? template.showLogo ?? false,
    };
    const logo: CardLogo = { image: logoImage, name: brand.name };
    const { width, height } = cardSize(template.ratio);

    const update = (patch: Partial<Edits>) => setEdits((current) => ({ ...current, ...patch }));

    useEffect(() => {
        if (!design.showLogo || !brand.logo_url || logoImage !== null || logoFailed) {
            return;
        }

        let cancelled = false;

        urlToDataUrl(brand.logo_url)
            .then((image) => {
                if (!cancelled) {
                    setLogoImage(image);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setLogoFailed(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [design.showLogo, brand.logo_url, logoImage, logoFailed]);

    const setPhoto = (photo: string | null) => update({ photo, ...photoDefaults });

    // The second photo starts beside the frame, a little turned, so it shows apart from the first one.
    const setOverlay = (photo: string | null) =>
        update({ overlay: photo === null ? null : { photo, x: width * 0.74, y: height * 0.56, size: width * 0.34, rotation: -8, opacity: 1 } });

    const updateOverlay = (patch: Partial<CardOverlay>) =>
        setEdits((current) => (current.overlay ? { ...current, overlay: { ...current.overlay, ...patch } } : current));

    const choosePhoto = async (file: File | null, layer: CardLayer = 'photo') => {
        if (!file) {
            return;
        }

        setBusy('photo');

        try {
            const photo = await readPhoto(file);

            if (layer === 'overlay') {
                setOverlay(photo);
            } else {
                setPhoto(photo);
            }
        } catch {
            toast.error(t('The photo could not be read.'));
        } finally {
            setBusy(null);
        }
    };

    const useAvatar = async () => {
        if (!defaults.avatar_url) {
            return;
        }

        setBusy('photo');

        try {
            setPhoto(await shrinkImage(await urlToDataUrl(defaults.avatar_url)));
        } catch {
            toast.error(t('Your profile photo could not be loaded; upload it from your device instead.'));
        } finally {
            setBusy(null);
        }
    };

    const pan = (dx: number, dy: number, layer: CardLayer) =>
        setEdits((current) =>
            layer === 'overlay' && current.overlay
                ? { ...current, overlay: { ...current.overlay, x: clamp(current.overlay.x + dx, 0, width), y: clamp(current.overlay.y + dy, 0, height) } }
                : {
                      ...current,
                      offsetX: clamp(current.offsetX + dx, -PAN_LIMIT, PAN_LIMIT),
                      offsetY: clamp(current.offsetY + dy, -PAN_LIMIT, PAN_LIMIT),
                  },
        );

    // Pinching a photo with two fingers, within the limits of its slider.
    const zoom = (factor: number, layer: CardLayer) =>
        setEdits((current) =>
            layer === 'overlay' && current.overlay
                ? { ...current, overlay: { ...current.overlay, size: clamp(current.overlay.size * factor, OVERLAY_MIN, OVERLAY_MAX) } }
                : { ...current, zoom: clamp(current.zoom * factor, ZOOM_MIN, ZOOM_MAX) },
        );

    const exportPng = async (): Promise<Blob | null> => {
        if (!svgRef.current) {
            return null;
        }

        setBusy('export');

        try {
            return await renderCardPng(svgRef.current, cardTextLines(template, design, design.showLogo ? brand.name : null, locale), width, height);
        } catch {
            toast.error(t('The card could not be exported.'));

            return null;
        } finally {
            setBusy(null);
        }
    };

    const fileName = `${template.id}.png`;

    const download = async () => {
        const blob = await exportPng();

        if (blob) {
            downloadBlob(blob, fileName);
            toast.success(t('The card was downloaded.'));
        }
    };

    const share = async () => {
        const blob = await exportPng();

        if (!blob) {
            return;
        }

        const result = await shareBlob(blob, fileName, design.title);

        if (result === 'shared') {
            toast.success(t('The card was shared.'));
        } else if (result === 'downloaded') {
            toast.success(t('The card was downloaded.'));
        }
    };

    const reset = () => {
        setEdits(initialEdits);
        toast.success(t('The card was reset.'));
    };

    return (
        // The card, its buttons and the controls are three cells: on computers the card and its buttons share the
        // first column; on phones the card sticks under the top bar (smaller) while the controls below it are used.
        <div className="grid gap-x-6 gap-y-3 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:items-start lg:gap-y-4">
            <div className="sticky top-(--topbar-height,4rem) z-10 -mx-4 bg-canvas/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:static lg:col-start-1 lg:row-start-1 lg:mx-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
                <div
                    style={{ '--card-ratio': width / height } as CSSProperties}
                    className={cn(
                        'mx-auto w-full overflow-hidden rounded-3xl shadow-2xl shadow-black/20 ring-1 ring-black/10',
                        'max-lg:max-w-[calc(38dvh*var(--card-ratio))] max-lg:rounded-2xl',
                        template.ratio === 'portrait' ? 'lg:max-w-md' : 'lg:max-w-lg',
                    )}
                >
                    <CardCanvas svgRef={svgRef} template={template} design={design} logo={logo} locale={locale} className="block h-auto w-full" onPan={pan} onZoom={zoom} />
                </div>
            </div>

            <div className="space-y-3 lg:col-start-1 lg:row-start-2 lg:space-y-4">
                {(design.photo || design.overlay) && (
                    <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
                        <Move className="size-3.5 shrink-0" />
                        {t('Drag a photo in the preview to move it, and pinch it with two fingers to zoom it.')}
                    </p>
                )}
                <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={() => void download()} loading={busy === 'export'}>
                        <Download />
                        {t('Download PNG')}
                    </Button>
                    <Button variant="secondary" onClick={() => void share()} disabled={busy === 'export'}>
                        <Share2 />
                        {t('Share')}
                    </Button>
                    <Button variant="ghost" onClick={reset}>
                        <RotateCcw />
                        {t('Reset')}
                    </Button>
                </div>
            </div>

            <Card className="max-lg:mt-3 lg:col-start-2 lg:row-span-2 lg:row-start-1">
                <CardHeader icon={Palette} title={t('Design your card')} description={t('Your photo stays on your device and is never uploaded to the server.')} />
                <CardBody className="space-y-7">
                    <Section title={t('Photo')}>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" size="sm" onClick={() => fileInput.current?.click()} loading={busy === 'photo'}>
                                <Camera />
                                {design.photo ? t('Change photo') : t('Upload photo')}
                            </Button>
                            {defaults.avatar_url && (
                                <Button variant="outline" size="sm" onClick={() => void useAvatar()} disabled={busy === 'photo'}>
                                    <UserRound />
                                    {t('Use my profile photo')}
                                </Button>
                            )}
                            {design.photo && (
                                <Button variant="ghost" size="sm" onClick={() => setPhoto(null)}>
                                    <Trash2 />
                                    {t('Remove')}
                                </Button>
                            )}
                        </div>
                        <p className="text-xs text-muted">{t('JPG or PNG from your device.')}</p>
                        <input
                            ref={fileInput}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                                void choosePhoto(event.target.files?.[0] ?? null);
                                event.target.value = '';
                            }}
                        />

                        <div className={cn('space-y-3 pt-1', !design.photo && 'pointer-events-none opacity-50')}>
                            <Slider
                                label={t('Zoom')}
                                value={design.zoom}
                                display={`${formatNumber(Math.round(design.zoom * 100), locale)}%`}
                                min={ZOOM_MIN}
                                max={ZOOM_MAX}
                                step={0.01}
                                onChange={(zoom) => update({ zoom })}
                            />
                            <Slider
                                label={t('Horizontal position')}
                                value={design.offsetX}
                                display={formatNumber(Math.round(design.offsetX), locale)}
                                min={-PAN_LIMIT}
                                max={PAN_LIMIT}
                                step={1}
                                onChange={(offsetX) => update({ offsetX })}
                            />
                            <Slider
                                label={t('Vertical position')}
                                value={design.offsetY}
                                display={formatNumber(Math.round(design.offsetY), locale)}
                                min={-PAN_LIMIT}
                                max={PAN_LIMIT}
                                step={1}
                                onChange={(offsetY) => update({ offsetY })}
                            />
                            <RotationControl value={design.rotation} onChange={(rotation) => update({ rotation })} />
                            <Slider
                                label={t('Opacity')}
                                value={design.opacity}
                                display={`${formatNumber(Math.round(design.opacity * 100), locale)}%`}
                                min={OPACITY_MIN}
                                max={1}
                                step={0.01}
                                onChange={(opacity) => update({ opacity })}
                            />
                        </div>
                    </Section>

                    <Section title={t('Second photo')}>
                        <p className="text-xs text-muted">{t('Add another photo anywhere on the card: a new one from your device, or a copy of the card photo.')}</p>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="secondary" size="sm" onClick={() => overlayInput.current?.click()} loading={busy === 'photo'}>
                                <ImagePlus />
                                {design.overlay ? t('Change photo') : t('Upload a photo')}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setOverlay(design.photo)} disabled={!design.photo || busy === 'photo'}>
                                <Copy />
                                {t('Copy the card photo')}
                            </Button>
                            {design.overlay && (
                                <Button variant="ghost" size="sm" onClick={() => setOverlay(null)}>
                                    <Trash2 />
                                    {t('Remove')}
                                </Button>
                            )}
                        </div>
                        <input
                            ref={overlayInput}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                                void choosePhoto(event.target.files?.[0] ?? null, 'overlay');
                                event.target.value = '';
                            }}
                        />

                        {design.overlay && (
                            <div className="space-y-3 pt-1">
                                <Slider
                                    label={t('Size')}
                                    value={design.overlay.size}
                                    display={`${formatNumber(Math.round((design.overlay.size / width) * 100), locale)}%`}
                                    min={OVERLAY_MIN}
                                    max={OVERLAY_MAX}
                                    step={1}
                                    onChange={(size) => updateOverlay({ size })}
                                />
                                <Slider
                                    label={t('Horizontal position')}
                                    value={design.overlay.x}
                                    display={formatNumber(Math.round(design.overlay.x), locale)}
                                    min={0}
                                    max={width}
                                    step={1}
                                    onChange={(x) => updateOverlay({ x })}
                                />
                                <Slider
                                    label={t('Vertical position')}
                                    value={design.overlay.y}
                                    display={formatNumber(Math.round(design.overlay.y), locale)}
                                    min={0}
                                    max={height}
                                    step={1}
                                    onChange={(y) => updateOverlay({ y })}
                                />
                                <RotationControl value={design.overlay.rotation} onChange={(rotation) => updateOverlay({ rotation })} />
                                <Slider
                                    label={t('Opacity')}
                                    value={design.overlay.opacity}
                                    display={`${formatNumber(Math.round(design.overlay.opacity * 100), locale)}%`}
                                    min={OPACITY_MIN}
                                    max={1}
                                    step={0.01}
                                    onChange={(opacity) => updateOverlay({ opacity })}
                                />
                            </div>
                        )}
                    </Section>

                    <Section title={t('Texts')}>
                        <Field label={t('Occasion title')} htmlFor="card-title">
                            <Input id="card-title" value={design.title} maxLength={60} onChange={(event) => update({ title: event.target.value })} />
                        </Field>
                        <Field label={t('Name')} htmlFor="card-name">
                            <Input id="card-name" value={design.name} maxLength={60} placeholder={t('Your name')} onChange={(event) => update({ name: event.target.value })} />
                        </Field>
                        <Field label={t('Message')} htmlFor="card-message">
                            <Textarea
                                id="card-message"
                                value={design.message}
                                maxLength={180}
                                rows={3}
                                placeholder={t('Write a short greeting…')}
                                onChange={(event) => update({ message: event.target.value })}
                            />
                        </Field>
                    </Section>

                    <Section title={t('Logo')}>
                        <Switch
                            checked={design.showLogo}
                            onChange={(showLogo) => update({ showLogo })}
                            label={t('Show the logo')}
                            description={
                                defaults.academy
                                    ? t('The academy logo and name appear in the corner of the card.')
                                    : t('The platform logo and name appear in the corner of the card.')
                            }
                        />
                    </Section>
                </CardBody>
            </Card>
        </div>
    );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-3">
            <h3 className="text-xs font-bold tracking-wide text-muted uppercase">{title}</h3>
            {children}
        </section>
    );
}

interface SliderProps {
    label: string;
    value: number;
    display: string;
    min: number;
    max: number;
    step: number;
    onChange: (value: number) => void;
}

/**
 * The turn of a photo: a quarter turn left or right with the buttons, or any angle with the slider.
 */
function RotationControl({ value, onChange }: { value: number; onChange: (value: number) => void }) {
    const { t, locale } = useTrans();

    return (
        <div className="space-y-2">
            <Slider label={t('Rotation')} value={value} display={`${formatNumber(Math.round(value), locale)}°`} min={-180} max={180} step={1} onChange={onChange} />
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onChange(turned(value - 90))}>
                    <RotateCcw />
                    {t('Turn left')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => onChange(turned(value + 90))}>
                    <RotateCw />
                    {t('Turn right')}
                </Button>
            </div>
        </div>
    );
}

function Slider({ label, value, display, min, max, step, onChange }: SliderProps) {
    return (
        <label className="block">
            <span className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-ink">{label}</span>
                <span className="text-xs text-muted tabular-nums">{display}</span>
            </span>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="h-1.5 w-full cursor-pointer accent-primary-600"
            />
        </label>
    );
}
