import { Link, useForm } from '@inertiajs/react';
import { GraduationCap, LogIn, School, ShieldCheck, UserPlus, UserRound } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Label } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import AuthLayout from '@/layouts/auth-layout';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import type { Role } from '@/types';

interface LoginProps {
    status?: string | null;
    demoAccounts: { role: Role; login: string }[];
}

const roleIcons = { admin: ShieldCheck, manager: School, teacher: GraduationCap, student: UserRound };

export default function Login({ status, demoAccounts }: LoginProps) {
    const { t } = useTrans();
    const labels = useLabels();
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

                <Checkbox
                    label={t('Remember me')}
                    checked={form.data.remember}
                    onChange={(event) => form.setData('remember', event.target.checked)}
                />

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

            {demoAccounts.length > 0 && (
                <div className="mt-8 rounded-2xl border border-dashed border-gold-300 bg-gold-50/60 p-4 dark:border-gold-500/30 dark:bg-gold-500/5">
                    <p className="text-xs font-semibold text-gold-800 dark:text-gold-300">
                        {t('Demo accounts (password: :password)', { password: 'password' })}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {demoAccounts.map((account) => {
                            const Icon = roleIcons[account.role];

                            return (
                                <button
                                    key={account.login}
                                    type="button"
                                    onClick={() => form.setData({ login: account.login, password: 'password', remember: true })}
                                    className="flex flex-col items-center gap-1.5 rounded-xl border border-line bg-surface px-2 py-3 text-xs font-semibold text-ink transition hover:border-primary-400 hover:text-primary-700"
                                >
                                    <Icon className="size-4.5 text-gold-600" />
                                    {labels.role[account.role]}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </AuthLayout>
    );
}
