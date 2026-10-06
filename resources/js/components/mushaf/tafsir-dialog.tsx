import { ChevronLeft, ChevronRight, Copy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AyahMarker } from '@/components/mushaf/mushaf-page';
import { ReadAloudControls } from '@/components/read-aloud/read-aloud-controls';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useReadAloud } from '@/hooks/use-read-aloud';
import { http } from '@/lib/http';
import { useTrans } from '@/lib/i18n';
import { readPreference, writePreference } from '@/lib/mushaf';
import { arabicDigits, surahName } from '@/lib/quran';
import { cn } from '@/lib/utils';

interface TafsirResult {
    ayah: { id: number; surah: number; ayah: number; page: number; text: string };
    edition: string;
    text: string | null;
}

interface TafsirDialogProps {
    ayahId: number | null;
    editions: { value: string; label: string }[];
    onClose: () => void;
}

const cache = new Map<string, TafsirResult>();

/**
 * The ayah with its explanation, from the tafsir book the reader chooses. The explanation can be read
 * aloud by the Arabic voice of the device (never the ayah itself), the paragraph being read is lit.
 */
export function TafsirDialog({ ayahId, editions, onClose }: TafsirDialogProps) {
    const { t } = useTrans();
    const [current, setCurrent] = useState<number | null>(ayahId);
    const [edition, setEdition] = useState<string>(() => readPreference('tafsir', editions[0]?.value ?? 'muyassar'));
    const [result, setResult] = useState<TafsirResult | null>(null);
    const [failed, setFailed] = useState(false);
    const reader = useReadAloud();
    const { stop } = reader;
    const paragraphs = useMemo(
        () =>
            (result?.text ?? '')
                .split(/\n+/)
                .map((paragraph) => paragraph.trim())
                .filter((paragraph) => paragraph !== ''),
        [result?.text],
    );

    useEffect(() => setCurrent(ayahId), [ayahId]);

    // Another ayah or book, or the window closed: stop reading.
    useEffect(() => {
        stop();
    }, [current, edition, ayahId, stop]);

    useEffect(() => {
        if (current === null) {
            return;
        }

        const key = `${edition}:${current}`;
        const cached = cache.get(key);
        setFailed(false);

        if (cached) {
            setResult(cached);

            return;
        }

        let active = true;
        setResult(null);

        http.get<TafsirResult>(route('mushaf.tafsir', current), { params: { edition } })
            .then(({ data }) => {
                cache.set(key, data);

                if (active) {
                    setResult(data);
                }
            })
            .catch(() => active && setFailed(true));

        return () => {
            active = false;
        };
    }, [current, edition]);

    const chooseEdition = (value: string) => {
        setEdition(value);
        writePreference('tafsir', value);
    };

    const ayah = result?.ayah;

    return (
        <Modal
            open={ayahId !== null}
            onClose={onClose}
            size="lg"
            title={ayah ? `${t('Surah')} ${surahName(ayah.surah, 'ar')} · ${t('Ayah')} ${arabicDigits(ayah.ayah)}` : t('Tafsir')}
            footer={
                <div className="flex w-full items-center justify-between gap-2">
                    <Button variant="secondary" size="sm" disabled={!current || current <= 1} onClick={() => setCurrent((value) => (value ? value - 1 : value))}>
                        <ChevronRight className="ltr:rotate-180" />
                        {t('Previous ayah')}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!result?.text}
                        aria-label={t('Copy')}
                        onClick={() =>
                            result?.text &&
                            void navigator.clipboard.writeText(`${result.ayah.text}\n\n${result.text}`).then(() => toast.success(t('Copied')))
                        }
                    >
                        <Copy />
                    </Button>
                    <Button variant="secondary" size="sm" disabled={!current || current >= 6236} onClick={() => setCurrent((value) => (value ? value + 1 : value))}>
                        {t('Next ayah')}
                        <ChevronLeft className="ltr:rotate-180" />
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <div className="flex gap-1 rounded-xl bg-surface-muted p-1">
                    {editions.map((item) => (
                        <button
                            key={item.value}
                            type="button"
                            onClick={() => chooseEdition(item.value)}
                            className={cn(
                                'flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                                edition === item.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
                            )}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="mushaf-paper relative rounded-2xl px-5 py-4">
                    {ayah ? (
                        <p dir="rtl" className="mushaf-text text-2xl">
                            {ayah.text}
                            <AyahMarker number={ayah.ayah} />
                        </p>
                    ) : (
                        <div className="h-16 animate-pulse rounded-xl bg-gold-500/10" />
                    )}
                </div>

                {failed ? (
                    <p className="text-sm text-rose-600">{t('The tafsir could not be loaded. Please try again.')}</p>
                ) : result ? (
                    paragraphs.length > 0 ? (
                        <div className="space-y-3">
                            <ReadAloudControls reader={reader} segments={paragraphs} label={t('Listen to the tafsir')} size="sm" />
                            <div dir="rtl" className="space-y-2 font-quran text-lg leading-loose text-ink/90">
                                {paragraphs.map((paragraph, index) => (
                                    <p
                                        key={index}
                                        className={cn(
                                            '-mx-2 rounded-xl px-2 transition-colors',
                                            reader.speaking && reader.current === index && 'bg-primary-50 text-ink dark:bg-primary-500/15',
                                        )}
                                    >
                                        {paragraph}
                                    </p>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className="font-quran text-lg leading-loose text-ink/90">{t('No tafsir for this ayah in this book.')}</p>
                    )
                ) : (
                    <div className="space-y-2">
                        {[100, 92, 96, 70].map((width) => (
                            <div key={width} className="h-4 animate-pulse rounded-full bg-surface-muted" style={{ width: `${width}%` }} />
                        ))}
                    </div>
                )}
            </div>
        </Modal>
    );
}
