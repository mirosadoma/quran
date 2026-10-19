import { usePage } from '@inertiajs/react';
import { Camera, Download, Move, Palette, RotateCcw, Share2, Trash2, UserRound } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CardCanvas, type CardLogo } from '@/components/cards/card-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Field, Input, Switch, Textarea } from '@/components/ui/form';
import { downloadBlob, readPhoto, renderCardPng, shareBlob, shrinkImage, urlToDataUrl } from '@/lib/card-export';
import { type CardDesign, type CardTemplate, cardSize, cardTextLines, localizedTemplateTexts } from '@/lib/cards';
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
    showLogo: boolean | null;
}

const initialEdits: Edits = { title: null, name: null, message: null, photo: null, zoom: 1, offsetX: 0, offsetY: 0, showLogo: null };
const PAN_LIMIT = 700;

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

    const setPhoto = (photo: string | null) => update({ photo, zoom: 1, offsetX: 0, offsetY: 0 });

    const choosePhoto = async (file: File | null) => {
        if (!file) {
            return;
        }

        setBusy('photo');

        try {
            setPhoto(await readPhoto(file));
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

    const pan = (dx: number, dy: number) =>
        setEdits((current) => ({
            ...current,
            offsetX: clamp(current.offsetX + dx, -PAN_LIMIT, PAN_LIMIT),
            offsetY: clamp(current.offsetY + dy, -PAN_LIMIT, PAN_LIMIT),
        }));

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
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            <div className="space-y-4">
                <div
                    className={cn(
                        'mx-auto w-full overflow-hidden rounded-3xl shadow-2xl shadow-black/20 ring-1 ring-black/10',
                        template.ratio === 'portrait' ? 'max-w-md' : 'max-w-lg',
                    )}
                >
                    <CardCanvas svgRef={svgRef} template={template} design={design} logo={logo} locale={locale} className="block h-auto w-full" onPan={pan} />
                </div>
                {design.photo && (
                    <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
                        <Move className="size-3.5" />
                        {t('Drag the photo in the preview to move it.')}
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

            <Card>
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
                                min={0.5}
                                max={3}
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
                        </div>
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
