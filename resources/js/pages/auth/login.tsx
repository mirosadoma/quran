import { Link, useForm } from '@inertiajs/react';
import { LogIn, UserPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, Input, Label } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import AuthLayout from '@/layouts/auth-layout';
import { useTrans } from '@/lib/i18n';

interface LoginProps {
    status?: string | null;
}

export default function Login({ status }: LoginProps) {
    const { t } = useTrans();
    const form = useForm({ login: '', password: '', remember: true });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('login.store'), { onFinish: () => form.reset('password') });
    };

    return (
        <AuthLayout title={t('Welcome back')} subtitle={t('Sign in to continue your journey with the Quran.')}>
            {status && (
                <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                <Field label={t('Email or phone number')} htmlFor="login" error={form.errors.login}>
                    <Input
                        id="login"
                        dir="ltr"
                        value={form.data.login}
                        onChange={(event) => form.setData('login', event.target.value)}
                        autoComplete="username"
                        autoFocus
                        placeholder="name@example.com"
                        aria-invalid={!!form.errors.login}
                    />
                </Field>

                <div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password">{t('Password')}</Label>
                        <Link href={route('password.request')} className="mb-1.5 text-xs font-semibold text-primary-700 hover:underline dark:text-primary-300">
                            {t('Forgot your password?')}
                        </Link>
                    </div>
                    <PasswordInput
                        id="password"
                        value={form.data.password}
                        onChange={(event) => form.setData('password', event.target.value)}
                        autoComplete="current-password"
                        aria-invalid={!!form.errors.password}
                    />
                    {form.errors.password && <p className="mt-1.5 text-xs font-medium text-rose-600">{form.errors.password}</p>}
                </div>

                <Button type="submit" size="lg" className="w-full" loading={form.processing}>
                    <LogIn className="rtl:rotate-180" />
                    {t('Sign in')}
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
                {t('New here?')}{' '}
                <Link href={route('register')} className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:underline dark:text-primary-300">
                    <UserPlus className="size-4" />
                    {t('Create a free account')}
                </Link>
            </p>
        </AuthLayout>
    );
}
