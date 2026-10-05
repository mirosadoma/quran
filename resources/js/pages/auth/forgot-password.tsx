import { Link, useForm } from '@inertiajs/react';
import { ArrowRight, Mail } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import AuthLayout from '@/layouts/auth-layout';
import { useTrans } from '@/lib/i18n';

export default function ForgotPassword({ status }: { status?: string | null }) {
    const { t } = useTrans();
    const form = useForm({ email: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('password.email'));
    };

    return (
        <AuthLayout
            title={t('Forgot your password?')}
            subtitle={t('Enter the email of your account and we will send you a link to choose a new password.')}
        >
            {status && (
                <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                <Field label={t('Email')} htmlFor="email" error={form.errors.email}>
                    <Input
                        id="email"
                        type="email"
                        dir="ltr"
                        value={form.data.email}
                        onChange={(event) => form.setData('email', event.target.value)}
                        autoFocus
                        aria-invalid={!!form.errors.email}
                    />
                </Field>

                <Button type="submit" size="lg" className="w-full" loading={form.processing}>
                    <Mail />
                    {t('Send reset link')}
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">{t('Signed up with a phone number only? Ask the administration to reset your password.')}</p>

            <Link href={route('login')} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-300">
                <ArrowRight className="size-4 ltr:rotate-180" />
                {t('Back to sign in')}
            </Link>
        </AuthLayout>
    );
}
