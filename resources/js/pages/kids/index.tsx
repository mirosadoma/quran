import { BookOpen } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Lesson } from '@/components/kids/lesson';
import { KidsHero, SurahPicker } from '@/components/kids/surah-picker';
import { EmptyState } from '@/components/ui/empty-state';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import { type KidsProgress, readProgress } from '@/lib/kids';
import type { ReciterItem } from '@/types';

interface KidsProps {
    ready: boolean;
    reciters: ReciterItem[];
}

/**
 * Memorizing for children: choose a surah, listen to the sheikh ayah by ayah, recite with the voice.
 */
export default function Kids({ ready, reciters }: KidsProps) {
    const { t } = useTrans();
    const [surah, setSurah] = useState<number | null>(null);
    const [progress, setProgress] = useState<KidsProgress>(readProgress);

    const pick = useCallback((number: number) => {
        setSurah(number);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    if (!ready) {
        return (
            <AppLayout title={t('Kids memorization')}>
                <EmptyState icon={BookOpen} title={t('The Quran text is not installed yet')} description={t('Run: php artisan db:seed --class=AyahSeeder')} />
            </AppLayout>
        );
    }

    return (
        <AppLayout title={t('Kids memorization')} hideHeader>
            {surah === null ? (
                <>
                    <KidsHero />
                    <SurahPicker progress={progress} onPick={pick} />
                </>
            ) : (
                <Lesson key={surah} surah={surah} reciters={reciters} progress={progress} onProgress={setProgress} onBack={() => setSurah(null)} />
            )}
        </AppLayout>
    );
}
