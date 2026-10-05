import { useForm } from '@inertiajs/react';
import { Send } from 'lucide-react';
import { type FormEvent, useEffect } from 'react';
import { AcademyLogo } from '@/components/academy/academy-logo';
import { Button } from '@/components/ui/button';
import { Field, Textarea } from '@/components/ui/form';
import { Modal } from '@/components/ui/modal';
import { useTrans } from '@/lib/i18n';
import type { AcademyItem } from '@/types';

interface JoinAcademyDialogProps {
    academy: Pick<AcademyItem, 'id' | 'name' | 'logo_url' | 'tagline'> | null;
    onClose: () => void;
}

/**
 * A student asks to join an academy, with an optional word to its manager.
 */
export function JoinAcademyDialog({ academy, onClose }: JoinAcademyDialogProps) {
    const { t } = useTrans();
    const form = useForm({ message: '' });

    useEffect(() => {
        if (academy) {
            form.reset();
            form.clearErrors();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [academy?.id]);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (academy) {
            form.post(route('academies.join', academy.id), { preserveScroll: true, onSuccess: onClose });
        }
    };

    return (
        <Modal open={academy !== null} onClose={onClose} title={t('Ask to join the academy')} size="md">
            {academy && (
                <form id="join-academy" onSubmit={submit} className="space-y-5">
                    <div className="flex items-center gap-3 rounded-2xl bg-surface-muted p-3">
                        <AcademyLogo academy={academy} size="sm" />
                        <div className="min-w-0">
                            <p className="truncate font-bold text-ink">{academy.name}</p>
                            {academy.tagline && <p className="truncate text-xs text-muted">{academy.tagline}</p>}
                        </div>
                    </div>
                    <Field
                        label={t('A word to the academy')}
                        hint={t('Optional: what you memorize now, what you want to learn, and the times that suit you.')}
                        error={form.errors.message}
                    >
                        <Textarea
                            rows={4}
                            maxLength={1000}
                            value={form.data.message}
                            onChange={(event) => form.setData('message', event.target.value)}
                            placeholder={t('For example: I memorize Juz Amma and want an evening halaqa.')}
                        />
                    </Field>
                    <p className="text-xs leading-relaxed text-muted">
                        {t('The manager of the academy answers your request. Once accepted you become one of its students; you study at one academy at a time.')}
                    </p>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button variant="secondary" onClick={onClose}>
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" loading={form.processing}>
                            <Send className="rtl:-scale-x-100" />
                            {t('Send the request')}
                        </Button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
