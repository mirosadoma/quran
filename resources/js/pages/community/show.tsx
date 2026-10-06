import { router } from '@inertiajs/react';
import { EllipsisVertical, GraduationCap, MessageCircle, MessageCircleQuestionMark, Pencil, Trash } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuthorLine } from '@/components/community/author-line';
import { PostStats } from '@/components/community/post-card';
import { PostForm } from '@/components/community/post-form';
import { ReplyForm } from '@/components/community/reply-form';
import { ReplyItem } from '@/components/community/reply-item';
import { SimilarQuestions } from '@/components/community/similar-questions';
import { Button } from '@/components/ui/button';
import { Card, CardHeader } from '@/components/ui/card';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/modal';
import AppLayout from '@/layouts/app-layout';
import { useTrans } from '@/lib/i18n';
import type { CommunityPostItem, CommunityPostSummary, CommunityReplyItem } from '@/types';

interface CommunityShowProps {
    post: CommunityPostItem;
    /** The answers of the sheikhs, the accepted one first. */
    answers: CommunityReplyItem[];
    comments: CommunityReplyItem[];
    similar: CommunityPostSummary[];
    /** The reply to scroll to (opened from a notification, or just written). */
    focus: number | null;
    can: { answer: boolean };
}

export default function CommunityShow({ post, answers, comments, similar, focus, can }: CommunityShowProps) {
    const { t } = useTrans();
    const [form, setForm] = useState<{ open: boolean; post: CommunityPostItem | null }>({ open: false, post: null });
    const [deleting, setDeleting] = useState(false);
    const [outlined, setOutlined] = useState<number | null>(focus);

    useEffect(() => {
        if (!focus) {
            return;
        }

        setOutlined(focus);
        document.getElementById(`reply-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

        const timer = window.setTimeout(() => setOutlined(null), 3000);

        return () => window.clearTimeout(timer);
    }, [focus]);

    return (
        <AppLayout
            title={post.title}
            heading={t('Questions community')}
            back={{ href: route('community.index'), label: t('All questions') }}
            actions={
                <Button variant="secondary" onClick={() => setForm({ open: true, post: null })}>
                    <MessageCircleQuestionMark />
                    {t('Ask a question')}
                </Button>
            }
        >
            <div className="grid gap-6 lg:grid-cols-3">
                <div className="min-w-0 space-y-6 lg:col-span-2">
                    <Card className="p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-3">
                            <AuthorLine author={post.author} createdAt={post.created_at} editedAt={post.edited_at} />
                            {(post.can.update || post.can.delete) && (
                                <Dropdown
                                    trigger={
                                        <Button variant="ghost" size="icon-sm" aria-label={t('Options')}>
                                            <EllipsisVertical />
                                        </Button>
                                    }
                                    className="w-44"
                                >
                                    {post.can.update && (
                                        <DropdownItem icon={Pencil} onClick={() => setForm({ open: true, post })}>
                                            {t('Edit')}
                                        </DropdownItem>
                                    )}
                                    {post.can.delete && (
                                        <DropdownItem icon={Trash} danger onClick={() => setDeleting(true)}>
                                            {t('Delete')}
                                        </DropdownItem>
                                    )}
                                </Dropdown>
                            )}
                        </div>
                        <h2 dir="auto" className="mt-4 text-xl font-bold leading-relaxed text-ink sm:text-2xl">
                            {post.title}
                        </h2>
                        <p dir="auto" className="mt-3 leading-loose whitespace-pre-line text-ink/90">
                            {post.body}
                        </p>
                        <PostStats post={post} className="mt-5 border-t border-line pt-4" />
                    </Card>

                    <section aria-labelledby="answers-heading">
                        <h3 id="answers-heading" className="mb-3 flex items-center gap-2 text-lg font-bold text-ink">
                            <GraduationCap className="size-5 text-gold-500" />
                            {t("Sheikhs' answers")}
                            <span className="text-sm font-semibold text-muted">({answers.length})</span>
                        </h3>
                        {answers.length === 0 ? (
                            <Card>
                                <EmptyState
                                    compact
                                    icon={GraduationCap}
                                    title={t('No answer yet')}
                                    description={t('The sheikhs of the platform will answer it soon, God willing.')}
                                />
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {answers.map((reply) => (
                                    <ReplyItem key={reply.id} reply={reply} focused={outlined === reply.id} />
                                ))}
                            </div>
                        )}
                    </section>

                    <section aria-labelledby="comments-heading">
                        <h3 id="comments-heading" className="mb-3 flex items-center gap-2 text-lg font-bold text-ink">
                            <MessageCircle className="size-5 text-primary-600 dark:text-primary-300" />
                            {t('Comments')}
                            <span className="text-sm font-semibold text-muted">({comments.length})</span>
                        </h3>
                        {comments.length === 0 ? (
                            <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-center text-sm text-muted">{t('No comments yet.')}</p>
                        ) : (
                            <div className="space-y-4">
                                {comments.map((reply) => (
                                    <ReplyItem key={reply.id} reply={reply} focused={outlined === reply.id} />
                                ))}
                            </div>
                        )}
                    </section>

                    <ReplyForm postId={post.id} asAnswer={can.answer} />
                </div>

                <aside className="space-y-6">
                    <Card className="lg:sticky lg:top-24">
                        <CardHeader icon={MessageCircleQuestionMark} title={t('Similar questions')} description={t('Maybe their answers help you too.')} />
                        <div className="p-2.5">
                            {similar.length === 0 ? (
                                <p className="px-2.5 py-4 text-center text-sm text-muted">{t('No similar questions yet.')}</p>
                            ) : (
                                <SimilarQuestions posts={similar} />
                            )}
                        </div>
                    </Card>
                </aside>
            </div>

            <PostForm open={form.open} post={form.post} onClose={() => setForm({ open: false, post: null })} />

            <ConfirmDialog
                open={deleting}
                onClose={() => setDeleting(false)}
                onConfirm={() => router.delete(route('community.destroy', post.id), { onFinish: () => setDeleting(false) })}
                title={t('Delete this question?')}
                message={t('Its answers and comments are deleted with it.')}
                confirmLabel={t('Delete')}
            />
        </AppLayout>
    );
}
