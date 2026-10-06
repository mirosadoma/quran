import { Link } from '@inertiajs/react';
import { CircleCheck, MessageCircleQuestionMark } from 'lucide-react';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { CommunityPostSummary } from '@/types';

/**
 * Questions like another one, with whether the sheikhs answered them.
 */
export function SimilarQuestions({ posts, onOpen, className }: { posts: CommunityPostSummary[]; onOpen?: () => void; className?: string }) {
    const { t } = useTrans();

    return (
        <ul className={cn('space-y-0.5', className)}>
            {posts.map((post) => (
                <li key={post.id}>
                    <Link
                        href={route('community.show', post.id)}
                        onClick={onOpen}
                        className="group flex items-start gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-surface-muted"
                    >
                        <MessageCircleQuestionMark className="mt-0.5 size-4 shrink-0 text-primary-600 dark:text-primary-300" />
                        <span className="min-w-0 flex-1">
                            <span dir="auto" className="line-clamp-2 text-sm font-medium text-ink group-hover:text-primary-700 dark:group-hover:text-primary-300">
                                {post.title}
                            </span>
                            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                                {post.answers_count > 0 ? t(':count answers', { count: post.answers_count }) : t('Awaiting an answer')}
                                {post.solved && (
                                    <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                                        <CircleCheck className="size-3.5" />
                                        {t('Solved')}
                                    </span>
                                )}
                            </span>
                        </span>
                    </Link>
                </li>
            ))}
        </ul>
    );
}
