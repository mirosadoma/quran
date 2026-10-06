import { Link } from '@inertiajs/react';
import { CircleCheck, GraduationCap, Hourglass, MessageCircle } from 'lucide-react';
import { AuthorLine } from '@/components/community/author-line';
import { Highlight } from '@/components/community/highlight';
import { Badge } from '@/components/ui/badge';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { CommunityPostItem } from '@/types';

/**
 * How many sheikhs answered a question and how many comments it has.
 */
export function PostStats({ post, className }: { post: CommunityPostItem; className?: string }) {
    const { t } = useTrans();
    const answers = post.answers_count ?? 0;
    const comments = post.comments_count ?? 0;

    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            {answers > 0 ? (
                <Badge tone="gold">
                    <GraduationCap className="size-3.5" />
                    {t(':count answers', { count: answers })}
                </Badge>
            ) : (
                <Badge tone="amber">
                    <Hourglass className="size-3.5" />
                    {t('Awaiting an answer')}
                </Badge>
            )}
            {post.solved && (
                <Badge tone="emerald">
                    <CircleCheck className="size-3.5" />
                    {t('Solved')}
                </Badge>
            )}
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted">
                <MessageCircle className="size-3.5" />
                {t(':count comments', { count: comments })}
            </span>
        </div>
    );
}

/**
 * A question in the list of the community (the whole card opens it).
 */
export function PostCard({ post, terms }: { post: CommunityPostItem; terms: string[] }) {
    return (
        <article className="relative rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgb(15_40_30/0.04)] transition hover:border-line-strong hover:shadow-lg hover:shadow-primary-950/5 sm:p-5">
            <AuthorLine author={post.author} createdAt={post.created_at} editedAt={post.edited_at} size="sm" />
            <h2 dir="auto" className="mt-3 text-base font-bold leading-relaxed text-ink sm:text-lg">
                <Link href={route('community.show', post.id)} className="after:absolute after:inset-0 after:rounded-2xl hover:text-primary-700 dark:hover:text-primary-300">
                    <Highlight text={post.title} terms={terms} />
                </Link>
            </h2>
            <p dir="auto" className="mt-1.5 line-clamp-3 text-sm leading-relaxed whitespace-pre-line text-muted">
                <Highlight text={post.body} terms={terms} />
            </p>
            <PostStats post={post} className="mt-4" />
        </article>
    );
}
