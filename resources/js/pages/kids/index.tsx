import { BookOpen } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Lesson } from '@/components/kids/lesson';
import { KidsHero, SurahPicker } from '@/components/kids/surah-picker';
import { EmptyState } from '@/components/ui/empty-state';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import { type KidsProgress, readProgress } from '@/lib/kids';
import type { RecitationMistake } from '@/lib/recitation-check';
import type { ReciterItem } from '@/types';

interface KidsProps {
    ready: boolean;
    reciters: ReciterItem[];
    /** The server can check the vowels of a recitation. */
    vowelCheck: boolean;
}

/**
 * Memorizing for children: choose a surah, listen to the sheikh ayah by ayah, recite with the voice.
 */
export default function Kids({ ready, reciters, vowelCheck }: KidsProps) {
    const { t } = useTrans();
    const [surah, setSurah] = useState<number | null>(null);
    const [progress, setProgress] = useState<KidsProgress>(readProgress);
    // The recitation mistakes stay marked on the ayahs until the page is reloaded.
    const [mistakes, setMistakes] = useState<RecitationMistake[]>([]);
    const recordMistake = useCallback((mistake: RecitationMistake) => setMistakes((list) => [...list, mistake]), []);

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
                <Lesson
                    key={surah}
                    surah={surah}
                    reciters={reciters}
                    progress={progress}
                    onProgress={setProgress}
                    vowelCheck={vowelCheck}
                    mistakes={mistakes}
                    onMistake={recordMistake}
                    onBack={() => setSurah(null)}
                />
            )}
        </AppLayout>
    );
}
