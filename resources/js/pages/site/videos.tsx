import { router } from '@inertiajs/react';
import { CirclePlay } from 'lucide-react';
import { useState } from 'react';
import { PageHero } from '@/components/site/section';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { VideoCard, VideoPlayer } from '@/components/video/video-components';
import PublicLayout from '@/layouts/public-layout';
import { useTrans } from '@/lib/i18n';
import { cleanQuery } from '@/lib/utils';
import type { Paginated, VideoItem } from '@/types';

interface VideosProps {
    videos: Paginated<VideoItem>;
    filters: { search: string };
}

export default function Videos({ videos, filters }: VideosProps) {
    const { t } = useTrans();
    const [playing, setPlaying] = useState<VideoItem | null>(null);

    return (
        <PublicLayout title={t('Videos')} description={t('Lessons in recitation, tajweed and memorization, free for everyone.')}>
            <PageHero eyebrow={t('Video library')} title={t('Lessons to benefit from')} description={t('Lessons in recitation, tajweed and memorization, free for everyone.')}>
                <SearchInput
                    value={filters.search}
                    onSearch={(search) => router.get(route('site.videos'), cleanQuery({ search }), { preserveState: true, preserveScroll: true, replace: true })}
                    placeholder={t('Search the videos...')}
                    className="mx-auto max-w-md text-start"
                />
            </PageHero>

            <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
                {videos.data.length === 0 ? (
                    <EmptyState icon={CirclePlay} title={filters.search ? t('No videos match your search') : t('No videos yet')} />
                ) : (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {videos.data.map((video) => (
                            <VideoCard key={video.id} video={video} onPlay={() => setPlaying(video)} />
                        ))}
                    </div>
                )}
                <Pagination data={videos} className="mt-10" />
            </div>

            <VideoPlayer video={playing} onClose={() => setPlaying(null)} />
        </PublicLayout>
    );
}
