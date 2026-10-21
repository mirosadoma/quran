import { Link, useForm } from '@inertiajs/react';
import { ArrowRight, KeyRound } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import AuthLayout from '@/layouts/auth-layout';
import { useTrans } from '@/lib/i18n';

export default function ResetPassword({ email, token }: { email: string; token: string }) {
    const { t } = useTrans();
    const form = useForm({ token, email, password: '', password_confirmation: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('password.store'), { onFinish: () => form.reset('password', 'password_confirmation') });
    };

    return (
        <AuthLayout title={t('Choose a new password')} subtitle={t('The code is confirmed. Use at least 8 characters.')}>
            <form onSubmit={submit} className="space-y-5">
                {/* The email comes from the confirmed code: shown, not changed */}
                <Field label={t('Email')} htmlFor="email" error={form.errors.email}>
                    <Input id="email" type="email" dir="ltr" value={form.data.email} readOnly className="bg-surface-muted text-muted" />
                </Field>
                <Field label={t('New password')} htmlFor="password" error={form.errors.password}>
                    <PasswordInput
                        id="password"
                        value={form.data.password}
                        onChange={(event) => form.setData('password', event.target.value)}
                        autoComplete="new-password"
                        autoFocus
                    />
                </Field>
                <Field label={t('Confirm password')} htmlFor="password_confirmation" error={form.errors.password_confirmation}>
                    <PasswordInput
                        id="password_confirmation"
                        value={form.data.password_confirmation}
                        onChange={(event) => form.setData('password_confirmation', event.target.value)}
                        autoComplete="new-password"
                    />
                </Field>
                <Button type="submit" size="lg" className="w-full" loading={form.processing}>
                    <KeyRound />
                    {t('Save the new password')}
                </Button>
            </form>

            <Link href={route('login')} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-300">
                <ArrowRight className="size-4 ltr:rotate-180" />
                {t('Back to sign in')}
            </Link>
        </AuthLayout>
    );
}
