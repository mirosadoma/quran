import { Check, LayoutGrid, Sparkles } from 'lucide-react';
import { memo, useMemo, useRef, useState } from 'react';
import { CardCanvas } from '@/components/cards/card-canvas';
import { CardEditor, type CardDefaults } from '@/components/cards/card-editor';
import { Tabs } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { type CardDesign, type CardOccasion, type CardTemplate, cardOccasions, cardTemplates, localizedTemplateTexts, templateById } from '@/lib/cards';
import { useTrans } from '@/lib/i18n';
import { localized } from '@/lib/prayers';
import { cn } from '@/lib/utils';

interface CardsProps {
    defaults: CardDefaults;
}

type OccasionFilter = CardOccasion | 'all';

/**
 * Greeting cards: pick a template, put your photo inside the design, write the greeting, then download or share it.
 */
export default function Cards({ defaults }: CardsProps) {
    const { t, locale } = useTrans();
    const [occasion, setOccasion] = useState<OccasionFilter>('all');
    const [templateId, setTemplateId] = useState(cardTemplates[0].id);
    const editor = useRef<HTMLDivElement>(null);
    const template = templateById(templateId);
    const shown = occasion === 'all' ? cardTemplates : cardTemplates.filter((item) => item.occasion === occasion);

    const choose = (id: string) => {
        setTemplateId(id);

        if (window.matchMedia('(max-width: 1023px)').matches) {
            editor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <AppLayout title={t('Greeting cards')} description={t('Choose a design, put your photo inside it, write your greeting, then download it or share it.')}>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-ink">
                <LayoutGrid className="size-5 text-primary-600" />
                {t('Templates')}
            </h2>
            <Tabs
                className="mb-4"
                value={occasion}
                onChange={setOccasion}
                items={[{ value: 'all' as const, label: t('All') }, ...cardOccasions.map((item) => ({ value: item.id, label: localized(item.name, locale) }))]}
            />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
                {shown.map((item) => (
                    <TemplateTile key={item.id} template={item} name={defaults.name} selected={item.id === templateId} onSelect={choose} />
                ))}
            </div>

            <div ref={editor} className="mt-10 scroll-mt-20">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink">
                    <Sparkles className="size-5 text-gold-600" />
                    {t('Your card')}
                </h2>
                <CardEditor template={template} defaults={defaults} />
            </div>
        </AppLayout>
    );
}

interface TemplateTileProps {
    template: CardTemplate;
    name: string;
    selected: boolean;
    onSelect: (id: string) => void;
}

/**
 * A template in the gallery: a live miniature of the design with a silhouette in place of the photo.
 */
const TemplateTile = memo(function TemplateTile({ template, name, selected, onSelect }: TemplateTileProps) {
    const { t, locale } = useTrans();
    const design = useMemo<CardDesign>(() => {
        const texts = localizedTemplateTexts(template, locale);

        return { title: texts.title, name, message: texts.message, photo: null, zoom: 1, offsetX: 0, offsetY: 0, showLogo: false };
    }, [template, name, locale]);

    return (
        <button
            type="button"
            onClick={() => onSelect(template.id)}
            aria-pressed={selected}
            className={cn(
                'group flex flex-col overflow-hidden rounded-2xl border bg-surface text-start shadow-xs transition',
                'hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-500/25',
                selected ? 'border-primary-500 ring-2 ring-primary-500/40' : 'border-line hover:border-primary-300',
            )}
        >
            <div className="relative flex aspect-4/5 items-center justify-center bg-surface-muted p-2">
                <CardCanvas template={template} design={design} locale={locale} className="block h-auto w-full rounded-lg shadow-md" />
                {selected && (
                    <span className="absolute end-3 top-3 flex size-6 items-center justify-center rounded-full bg-primary-600 text-white shadow">
                        <Check className="size-3.5" />
                    </span>
                )}
            </div>
            <div className="px-3 py-2">
                <p className="truncate text-sm font-semibold text-ink">{localized(template.name, locale)}</p>
                <p className="text-[11px] text-muted">{template.ratio === 'portrait' ? t('Portrait') : t('Square')}</p>
            </div>
        </button>
    );
});
