import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { hasLetters } from '@/lib/arabic';
import { http } from '@/lib/http';
import { useTrans } from '@/lib/i18n';
import { arabicDigits, surahName } from '@/lib/quran';
import type { MushafAyah } from '@/types';

/**
 * Administration: write, correct or remove the meanings of the words of an ayah (shown in green
 * in the mushaf). A meaning left empty is no longer shown.
 */
export function MeaningsDialog({ ayah, onClose, onSaved }: { ayah: MushafAyah | null; onClose: () => void; onSaved: (ayahId: number, meanings: Record<number, string>) => void }) {
    const { t } = useTrans();
    const [values, setValues] = useState<Record<number, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (ayah) {
            setValues({ ...(ayah.meanings ?? {}) });
        }
    }, [ayah]);

    if (!ayah) {
        return null;
    }

    const words = ayah.text.split(' ');

    const save = async () => {
        setSaving(true);

        try {
            const meanings = words
                .map((_, position) => ({ position, meaning: (values[position] ?? '').trim() }))
                .filter(({ position, meaning }) => meaning !== '' || (ayah.meanings?.[position] ?? '') !== '');

            const { data } = await http.put<{ meanings: Record<number, string> }>(route('mushaf.meanings.update', ayah.id), { meanings });
            onSaved(ayah.id, data.meanings);
            toast.success(t('The meanings were saved.'));
            onClose();
        } catch {
            toast.error(t('Something went wrong, please try again.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            size="lg"
            title={t('Word meanings')}
            description={`${t('Surah')} ${surahName(ayah.surah, 'ar')} · ${t('Ayah')} ${arabicDigits(ayah.ayah)} — ${t('Leave a meaning empty to hide it.')}`}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button loading={saving} onClick={save}>
                        {t('Save')}
                    </Button>
                </>
            }
        >
            <div className="space-y-2">
                {words.map((word, position) =>
                    hasLetters(word) ? (
                        <label key={position} className="grid grid-cols-[minmax(6rem,auto)_1fr] items-center gap-3">
                            <span dir="rtl" className="font-quran text-2xl leading-loose text-ink">
                                {word}
                            </span>
                            <Input
                                value={values[position] ?? ''}
                                onChange={(event) => setValues((current) => ({ ...current, [position]: event.target.value }))}
                                placeholder={t('Meaning (optional)')}
                                maxLength={500}
                                dir="rtl"
                            />
                        </label>
                    ) : null,
                )}
            </div>
        </Modal>
    );
}
