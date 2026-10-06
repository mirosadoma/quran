import { router } from '@inertiajs/react';
import { MessageCircleQuestionMark, SearchX } from 'lucide-react';
import { useState } from 'react';
import { IslamicPattern } from '@/components/brand';
import { PostCard } from '@/components/community/post-card';
import { PostForm } from '@/components/community/post-form';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { SearchInput } from '@/components/ui/search-input';
import { Tabs } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import { cleanQuery } from '@/lib/utils';
import type { CommunityPostItem, Paginated } from '@/types';

type Filter = 'all' | 'unanswered' | 'mine';

interface CommunityIndexProps {
    posts: Paginated<CommunityPostItem>;
    filters: { search: string; filter: Filter };
    /** The words the results matched (reduced for searching), to highlight them. */
    highlight: string[];
    counts: Record<Filter, number>;
}

export default function CommunityIndex({ posts, filters, highlight, counts }: CommunityIndexProps) {
    const { t } = useTrans();
    const [asking, setAsking] = useState<{ open: boolean; title: string }>({ open: false, title: '' });
    const searching = filters.search.trim() !== '' && highlight.length > 0;

    const apply = (changes: Partial<{ search: string; filter: Filter | null }>) => {
        const query = { search: filters.search, filter: filters.filter === 'all' ? null : filters.filter, ...changes };

        router.get(route('community.index'), cleanQuery(query), { preserveState: true, preserveScroll: true, replace: true });
    };

    const ask = (title = '') => setAsking({ open: true, title });

    return (
        <AppLayout
            title={t('Questions community')}
            description={t('Ask about your religion and your memorization: the sheikhs of the platform answer, and everyone benefits.')}
            actions={
                <Button onClick={() => ask()}>
                    <MessageCircleQuestionMark />
                    {t('Ask a question')}
                </Button>
            }
        >
            <div className="relative mb-6 overflow-hidden rounded-3xl bg-sidebar px-5 py-6 text-white shadow-xl shadow-primary-950/10 sm:px-8 sm:py-7">
                <IslamicPattern className="text-gold-300/[0.1]" size={64} />
                <div className="pointer-events-none absolute -end-16 -top-28 size-80 rounded-full bg-primary-400/25 blur-3xl" />
                <div className="relative max-w-2xl">
                    <h2 className="text-lg font-bold sm:text-xl">{t('Did someone ask your question before?')}</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-sidebar-ink/80">
                        {t('Search the questions, the answers of the sheikhs and the comments; words are found whatever their diacritics or letter forms.')}
                    </p>
                    <SearchInput
                        value={filters.search}
                        onSearch={(search) => apply({ search })}
                        placeholder={t('Search the questions and answers...')}
                        className="mt-4"
                    />
                </div>
            </div>

            <Tabs<Filter>
                items={[
                    { value: 'all', label: t('All questions'), count: counts.all },
                    { value: 'unanswered', label: t('Unanswered'), count: counts.unanswered },
                    { value: 'mine', label: t('My questions'), count: counts.mine },
                ]}
                value={filters.filter}
                onChange={(filter) => apply({ filter: filter === 'all' ? null : filter })}
                className="mb-5"
            />

            {searching && posts.total > 0 && (
                <p className="mb-3 text-sm text-muted">{t(':count questions match your search, the closest first.', { count: posts.total })}</p>
            )}

            {posts.data.length === 0 ? (
                <Card>
                    {searching ? (
                        <EmptyState
                            icon={SearchX}
                            title={t('No question like yours yet')}
                            description={t('Ask it, and a sheikh of the platform will answer it, God willing.')}
                            action={
                                <Button onClick={() => ask(filters.search)}>
                                    <MessageCircleQuestionMark />
                                    {t('Ask it now')}
                                </Button>
                            }
                        />
                    ) : (
                        <EmptyState
                            icon={MessageCircleQuestionMark}
                            title={filters.filter === 'all' ? t('No questions yet') : t('No questions here')}
                            description={t('Be the first to ask: any sheikh of the platform can answer.')}
                            action={
                                <Button onClick={() => ask()}>
                                    <MessageCircleQuestionMark />
                                    {t('Ask a question')}
                                </Button>
                            }
                        />
                    )}
                </Card>
            ) : (
                <div className="space-y-3">
                    {posts.data.map((post) => (
                        <PostCard key={post.id} post={post} terms={highlight} />
                    ))}
                </div>
            )}

            <Pagination data={posts} className="mt-8" />

            <PostForm open={asking.open} initialTitle={asking.title} onClose={() => setAsking({ open: false, title: '' })} />
        </AppLayout>
    );
}
