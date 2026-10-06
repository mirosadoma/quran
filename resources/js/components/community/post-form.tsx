import { useForm } from '@inertiajs/react';
import { Lightbulb, MessageCircleQuestionMark } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { SimilarQuestions } from '@/components/community/similar-questions';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { useDebounce } from '@/hooks/use-debounce';
import { searchable } from '@/lib/community';
import { http } from '@/lib/http';
import { useTrans } from '@/lib/i18n';
import type { CommunityPostItem, CommunityPostSummary } from '@/types';

interface PostFormProps {
    open: boolean;
    onClose: () => void;
    /** The question to edit; a new question otherwise. */
    post?: CommunityPostItem | null;
    /** Title of a new question (what the user searched for). */
    initialTitle?: string;
}

/**
 * Ask a question (questions like it are suggested while it is written), or edit one.
 */
export function PostForm({ open, onClose, post = null, initialTitle = '' }: PostFormProps) {
    const { t } = useTrans();
    const form = useForm({ title: '', body: '' });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.clearErrors();
        form.setData({ title: post?.title ?? initialTitle, body: post?.body ?? '' });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, post?.id]);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => onClose() };

        if (post) {
            form.put(route('community.update', post.id), options);
        } else {
            form.post(route('community.store'), options);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="lg"
            title={post ? t('Edit the question') : t('Ask a question')}
            description={post ? undefined : t('Any sheikh of the platform can answer it, and every member can benefit from the answer.')}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" form="community-post-form" loading={form.processing}>
                        <MessageCircleQuestionMark />
                        {post ? t('Save changes') : t('Post the question')}
                    </Button>
                </>
            }
        >
            <form id="community-post-form" onSubmit={submit} className="space-y-4">
                <Field label={t('Your question')} error={form.errors.title} required>
                    <Input
                        dir="auto"
                        value={form.data.title}
                        onChange={(event) => form.setData('title', event.target.value)}
                        maxLength={200}
                        placeholder={t('e.g. Can I read the Quran from my phone without wudu?')}
                        aria-invalid={!!form.errors.title}
                    />
                </Field>

                {!post && open && <SimilarSuggestions title={form.data.title} onOpen={onClose} />}

                <Field label={t('Details')} error={form.errors.body} hint={t('Explain your situation so the sheikhs can answer you precisely.')} required>
                    <Textarea
                        dir="auto"
                        rows={6}
                        value={form.data.body}
                        onChange={(event) => form.setData('body', event.target.value)}
                        maxLength={5000}
                        aria-invalid={!!form.errors.body}
                    />
                </Field>
            </form>
        </Modal>
    );
}

/**
 * Questions like the one being written: maybe it was answered already.
 */
function SimilarSuggestions({ title, onOpen }: { title: string; onOpen: () => void }) {
    const { t } = useTrans();
    const query = useDebounce(title.trim(), 500);
    const [posts, setPosts] = useState<CommunityPostSummary[]>([]);

    useEffect(() => {
        if (searchable(query).length < 3) {
            setPosts([]);

            return;
        }

        let current = true;

        http.get<{ posts: CommunityPostSummary[] }>(route('community.similar'), { params: { q: query } })
            .then(({ data }) => {
                if (current) {
                    setPosts(data.posts);
                }
            })
            .catch(() => undefined);

        return () => {
            current = false;
        };
    }, [query]);

    if (posts.length === 0) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-gold-200 bg-gold-50/60 p-3 dark:border-gold-500/20 dark:bg-gold-500/5">
            <p className="flex items-center gap-2 px-1 text-sm font-semibold text-ink">
                <Lightbulb className="size-4 text-gold-600 dark:text-gold-300" />
                {t('Maybe your question is already answered')}
            </p>
            <SimilarQuestions posts={posts} onOpen={onOpen} className="mt-1.5" />
        </div>
    );
}
