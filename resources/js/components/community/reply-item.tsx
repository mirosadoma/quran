import { router, useForm } from '@inertiajs/react';
import { CircleCheck, GraduationCap, Pencil, Trash } from 'lucide-react';
import { type FormEvent, type ReactNode, useState } from 'react';
import { AuthorLine } from '@/components/community/author-line';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FieldError, Textarea } from '@/components/ui/form';
import { ConfirmDialog } from '@/components/ui/modal';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { roleTone, useLabels } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { CommunityReplyItem } from '@/types';

interface ReplyItemProps {
    reply: CommunityReplyItem;
    /** Opened from a notification: briefly outlined. */
    focused?: boolean;
}

/**
 * A sheikh's answer (a highlighted card) or a comment (a bubble, like the comments of a post).
 */
export function ReplyItem({ reply, focused = false }: ReplyItemProps) {
    const [editing, setEditing] = useState(false);

    const body = editing ? (
        <ReplyEditor reply={reply} onDone={() => setEditing(false)} />
    ) : (
        <p dir="auto" className="leading-relaxed whitespace-pre-line text-ink/90">
            {reply.body}
        </p>
    );

    return reply.is_answer ? (
        <AnswerCard reply={reply} focused={focused} onEdit={() => setEditing(true)} editing={editing}>
            {body}
        </AnswerCard>
    ) : (
        <CommentBubble reply={reply} focused={focused} onEdit={() => setEditing(true)} editing={editing}>
            {body}
        </CommentBubble>
    );
}

interface ReplyLayoutProps extends Required<ReplyItemProps> {
    editing: boolean;
    onEdit: () => void;
    children: ReactNode;
}

function AnswerCard({ reply, focused, editing, onEdit, children }: ReplyLayoutProps) {
    const { t } = useTrans();

    return (
        <article
            id={`reply-${reply.id}`}
            className={cn(
                'scroll-mt-24 rounded-2xl border bg-surface p-4 shadow-[0_1px_2px_rgb(15_40_30/0.04)] transition sm:p-5',
                reply.is_accepted
                    ? 'border-emerald-300 bg-emerald-50/40 dark:border-emerald-500/40 dark:bg-emerald-500/5'
                    : 'border-gold-200 dark:border-gold-500/25',
                focused && 'ring-2 ring-gold-400 ring-offset-2 ring-offset-canvas',
            )}
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <AuthorLine author={reply.author} createdAt={reply.created_at} editedAt={reply.edited_at} />
                <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="gold">
                        <GraduationCap className="size-3.5" />
                        {t("Sheikh's answer")}
                    </Badge>
                    {reply.is_accepted && (
                        <Badge tone="emerald">
                            <CircleCheck className="size-3.5" />
                            {t('Accepted answer')}
                        </Badge>
                    )}
                </div>
            </div>

            <div className="mt-3.5">{children}</div>

            {!editing && (reply.can.accept || reply.can.update || reply.can.delete) && (
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                    {reply.can.accept && (
                        <Button
                            size="sm"
                            variant={reply.is_accepted ? 'secondary' : 'success'}
                            onClick={() => router.patch(route('community.replies.accept', reply.id), {}, { preserveScroll: true })}
                        >
                            <CircleCheck />
                            {reply.is_accepted ? t('Unmark the answer') : t('This answered my question')}
                        </Button>
                    )}
                    <ReplyActions reply={reply} onEdit={onEdit} className="ms-auto" />
                </div>
            )}
        </article>
    );
}

function CommentBubble({ reply, focused, editing, onEdit, children }: ReplyLayoutProps) {
    const { t } = useTrans();
    const labels = useLabels();
    const dates = useDates();
    const name = reply.author?.name ?? t('Deleted user');

    return (
        <div id={`reply-${reply.id}`} className="flex scroll-mt-24 gap-3">
            <Avatar name={name} src={reply.author?.avatar_url} size="sm" className="mt-1" />
            <div className="min-w-0 flex-1">
                <div
                    className={cn(
                        'rounded-2xl rounded-ss-md bg-surface-muted px-4 py-3 ring-1 ring-line transition',
                        focused && 'ring-2 ring-gold-400',
                    )}
                >
                    <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-semibold text-ink">{name}</span>
                        {reply.author && <Badge tone={roleTone[reply.author.role]}>{labels.role[reply.author.role]}</Badge>}
                    </div>
                    <div className="text-[15px]">{children}</div>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-2 text-xs text-muted">
                    {reply.created_at && (
                        <time dateTime={reply.created_at} title={dates.dateTime(reply.created_at)}>
                            {dates.relative(reply.created_at)}
                        </time>
                    )}
                    {reply.edited_at && <span title={dates.dateTime(reply.edited_at)}>{t('Edited')}</span>}
                    {!editing && <ReplyActions reply={reply} onEdit={onEdit} compact />}
                </div>
            </div>
        </div>
    );
}

/**
 * Edit and delete buttons of a reply, for its author (and delete for the administration).
 */
function ReplyActions({ reply, onEdit, compact = false, className }: { reply: CommunityReplyItem; onEdit: () => void; compact?: boolean; className?: string }) {
    const { t } = useTrans();
    const [deleting, setDeleting] = useState(false);

    if (!reply.can.update && !reply.can.delete) {
        return null;
    }

    const linkClasses = 'font-semibold transition hover:text-ink';

    return (
        <div className={cn('flex items-center', compact ? 'gap-3' : 'gap-1', className)}>
            {reply.can.update &&
                (compact ? (
                    <button type="button" onClick={onEdit} className={linkClasses}>
                        {t('Edit')}
                    </button>
                ) : (
                    <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label={t('Edit')} title={t('Edit')}>
                        <Pencil />
                    </Button>
                ))}
            {reply.can.delete &&
                (compact ? (
                    <button type="button" onClick={() => setDeleting(true)} className={cn(linkClasses, 'hover:text-rose-600')}>
                        {t('Delete')}
                    </button>
                ) : (
                    <Button variant="ghost" size="icon-sm" className="hover:text-rose-600" onClick={() => setDeleting(true)} aria-label={t('Delete')} title={t('Delete')}>
                        <Trash />
                    </Button>
                ))}

            <ConfirmDialog
                open={deleting}
                onClose={() => setDeleting(false)}
                onConfirm={() => router.delete(route('community.replies.destroy', reply.id), { preserveScroll: true, onFinish: () => setDeleting(false) })}
                title={reply.is_answer ? t('Delete this answer?') : t('Delete this comment?')}
                message={reply.body.length > 160 ? `${reply.body.slice(0, 160)}…` : reply.body}
                confirmLabel={t('Delete')}
            />
        </div>
    );
}

function ReplyEditor({ reply, onDone }: { reply: CommunityReplyItem; onDone: () => void }) {
    const { t } = useTrans();
    const form = useForm({ body: reply.body });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.put(route('community.replies.update', reply.id), { preserveScroll: true, onSuccess: () => onDone() });
    };

    return (
        <form onSubmit={submit} className="space-y-2">
            <Textarea
                dir="auto"
                rows={4}
                autoFocus
                value={form.data.body}
                onChange={(event) => form.setData('body', event.target.value)}
                maxLength={5000}
                aria-invalid={!!form.errors.body}
            />
            <FieldError message={form.errors.body} />
            <div className="flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={onDone}>
                    {t('Cancel')}
                </Button>
                <Button size="sm" type="submit" loading={form.processing}>
                    {t('Save')}
                </Button>
            </div>
        </form>
    );
}
