import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { roleTone, useLabels } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { CommunityAuthor } from '@/types';

interface AuthorLineProps {
    author: CommunityAuthor | null | undefined;
    createdAt: string | null;
    editedAt?: string | null;
    size?: 'sm' | 'md';
    className?: string;
}

/**
 * Who wrote a question or a reply (with their role) and when.
 */
export function AuthorLine({ author, createdAt, editedAt, size = 'md', className }: AuthorLineProps) {
    const { t } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const name = author?.name ?? t('Deleted user');

    return (
        <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
            <Avatar name={name} src={author?.avatar_url} size={size} />
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={cn('truncate font-semibold text-ink', size === 'sm' ? 'text-sm' : 'text-[15px]')}>{name}</span>
                    {author && <Badge tone={roleTone[author.role]}>{labels.role[author.role]}</Badge>}
                </div>
                {createdAt && (
                    <p className="mt-0.5 text-xs text-muted">
                        <time dateTime={createdAt} title={dates.dateTime(createdAt)}>
                            {dates.relative(createdAt)}
                        </time>
                        {editedAt && <span title={dates.dateTime(editedAt)}> · {t('Edited')}</span>}
                    </p>
                )}
            </div>
        </div>
    );
}
