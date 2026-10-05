import { router } from '@inertiajs/react';
import { CirclePlay, Globe, Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { VideoCard, VideoForm, VideoPlayer } from '@/components/video/video-components';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import { cleanQuery, cn, colorOf } from '@/lib/utils';
import type { HalaqaRef, Paginated, VideoItem } from '@/types';

interface VideosIndexProps {
    videos: Paginated<VideoItem>;
    filters: { halaqa: string | null; search: string };
    halaqat: HalaqaRef[];
    manageableHalaqat: HalaqaRef[];
    openVideo: VideoItem | null;
    can: { create: boolean; general: boolean };
}

export default function VideosIndex({ videos, filters, halaqat, manageableHalaqat, openVideo, can }: VideosIndexProps) {
    const { t } = useTrans();
    const [playing, setPlaying] = useState<VideoItem | null>(openVideo);
    const [form, setForm] = useState<{ open: boolean; video: VideoItem | null }>({ open: false, video: null });

    const apply = (changes: Partial<VideosIndexProps['filters']>) => {
        router.get(route('videos.index'), cleanQuery({ ...filters, ...changes }), { preserveState: true, preserveScroll: true, replace: true });
    };

    const chip = (active: boolean) =>
        cn(
            'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
            active ? 'bg-primary-700 text-white' : 'bg-surface text-muted ring-1 ring-line hover:text-ink',
        );

    return (
        <AppLayout
            title={t('Video library')}
            description={t('Recorded lessons and recitations to listen to and learn from.')}
            actions={
                can.create && (
                    <Button onClick={() => setForm({ open: true, video: null })}>
                        <Plus />
                        {t('Add a video')}
                    </Button>
                )
            }
        >
            <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:flex-1">
                    <button type="button" className={chip(!filters.halaqa)} onClick={() => apply({ halaqa: null })}>
                        {t('All')}
                    </button>
                    <button type="button" className={chip(filters.halaqa === 'general')} onClick={() => apply({ halaqa: 'general' })}>
                        <Globe className="size-3.5" />
                        {t('General library')}
                    </button>
                    {halaqat.map((halaqa) => (
                        <button key={halaqa.id} type="button" className={chip(filters.halaqa === String(halaqa.id))} onClick={() => apply({ halaqa: String(halaqa.id) })}>
                            <span className={cn('size-2 rounded-full', colorOf(halaqa.color).dot)} />
                            {halaqa.name}
                        </button>
                    ))}
                </div>
                <SearchInput value={filters.search} onSearch={(search) => apply({ search })} placeholder={t('Search videos...')} className="lg:w-72" />
            </div>

            {videos.data.length === 0 ? (
                <Card>
                    <EmptyState
                        icon={CirclePlay}
                        title={t('No videos yet')}
                        description={can.create ? t('Add YouTube lessons for all students or for a specific halaqa.') : undefined}
                    />
                </Card>
            ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {videos.data.map((video) => (
                        <VideoCard key={video.id} video={video} onPlay={() => setPlaying(video)} onEdit={() => setForm({ open: true, video })} />
                    ))}
                </div>
            )}

            <Pagination data={videos} className="mt-8" />

            <VideoPlayer video={playing} onClose={() => setPlaying(null)} />
            {can.create && (
                <VideoForm
                    open={form.open}
                    onClose={() => setForm({ open: false, video: null })}
                    video={form.video}
                    halaqat={manageableHalaqat}
                    allowGeneral={can.general}
                />
            )}
        </AppLayout>
    );
}
