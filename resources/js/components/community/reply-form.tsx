import { useForm, usePage } from '@inertiajs/react';
import { Send } from 'lucide-react';
import type { FormEvent } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FieldError, Textarea } from '@/components/ui/form';
import { useTrans } from '@/lib/i18n';

interface ReplyFormProps {
    postId: number;
    /** What the user writes is a sheikh's answer (teachers, managers and the administration), not a comment. */
    asAnswer: boolean;
}

/**
 * Answer the question (sheikhs) or comment on it (students).
 */
export function ReplyForm({ postId, asAnswer }: ReplyFormProps) {
    const { auth } = usePage().props;
    const { t } = useTrans();
    const form = useForm({ body: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('community.replies.store', postId), { preserveScroll: true, onSuccess: () => form.reset() });
    };

    return (
        <Card className="p-4 sm:p-5">
            <form onSubmit={submit} className="flex gap-3">
                {auth.user && <Avatar name={auth.user.name} src={auth.user.avatar_url} size="sm" className="mt-1 hidden sm:inline-flex" />}
                <div className="min-w-0 flex-1 space-y-2">
                    <Textarea
                        dir="auto"
                        rows={asAnswer ? 5 : 3}
                        value={form.data.body}
                        onChange={(event) => form.setData('body', event.target.value)}
                        maxLength={5000}
                        placeholder={asAnswer ? t('Write your answer...') : t('Write a comment...')}
                        aria-label={asAnswer ? t('Your answer') : t('Your comment')}
                        aria-invalid={!!form.errors.body}
                    />
                    <FieldError message={form.errors.body} />
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs leading-relaxed text-muted">
                            {asAnswer
                                ? t("Your reply appears as a sheikh's answer, and the member who asked is notified.")
                                : t('The sheikhs answer the questions; your reply appears as a comment.')}
                        </p>
                        <Button type="submit" loading={form.processing} disabled={form.data.body.trim() === ''}>
                            <Send className="rtl:-scale-x-100" />
                            {asAnswer ? t('Post the answer') : t('Comment')}
                        </Button>
                    </div>
                </div>
            </form>
        </Card>
    );
}
