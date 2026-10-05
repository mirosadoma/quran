import { Link, useForm } from '@inertiajs/react';
import { Building2, LogIn, UserPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldError, Input } from '@/components/ui/form';
import { PasswordInput } from '@/components/ui/password-input';
import AuthLayout from '@/layouts/auth-layout';
import { useTrans } from '@/lib/i18n';
import { useLabels } from '@/lib/labels';
import { cn } from '@/lib/utils';
import type { Gender } from '@/types';

interface RegisterProps {
    /** The academy the visitor came from, to ask to join it once the account is ready. */
    academy: { name: string; slug: string } | null;
}

export default function Register({ academy }: RegisterProps) {
    const { t } = useTrans();
    const labels = useLabels();

    const form = useForm({
        name: '',
        email: '',
        phone: '',
        gender: '' as Gender | '',
        password: '',
        password_confirmation: '',
        terms: false,
        academy: academy?.slug ?? '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('register.store'), { onFinish: () => form.reset('password', 'password_confirmation') });
    };

    return (
        <AuthLayout title={t('Create your free account')} subtitle={t('Read, listen, recite and keep your adhkar, and join an academy whenever you are ready.')}>
            {academy && (
                <div className="mb-6 flex gap-3 rounded-2xl border border-primary-200 bg-primary-50 p-4 text-sm text-primary-900 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-100">
                    <Building2 className="mt-0.5 size-5 shrink-0" />
                    <p>{t('Once your account is ready, you will send your request to join :academy.', { academy: academy.name })}</p>
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                <Field label={t('Full name')} htmlFor="name" error={form.errors.name} required>
                    <Input
                        id="name"
                        value={form.data.name}
                        onChange={(event) => form.setData('name', event.target.value)}
                        autoComplete="name"
                        autoFocus
                        aria-invalid={!!form.errors.name}
                    />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                    <Field label={t('Email')} htmlFor="email" error={form.errors.email} hint={t('Email or phone is required.')}>
                        <Input
                            id="email"
                            type="email"
                            dir="ltr"
                            value={form.data.email}
                            onChange={(event) => form.setData('email', event.target.value)}
                            autoComplete="email"
                            placeholder="name@example.com"
                            aria-invalid={!!form.errors.email}
                        />
                    </Field>
                    <Field label={t('Phone (WhatsApp)')} htmlFor="phone" error={form.errors.phone}>
                        <Input
                            id="phone"
                            type="tel"
                            dir="ltr"
                            value={form.data.phone}
                            onChange={(event) => form.setData('phone', event.target.value)}
                            autoComplete="tel"
                            placeholder="+201001234567"
                            aria-invalid={!!form.errors.phone}
                        />
                    </Field>
                </div>

                <Field label={t('Gender')} error={form.errors.gender} hint={t('Helps the academies place you in a suitable halaqa.')}>
                    <div className="grid grid-cols-2 gap-2">
                        {(['male', 'female'] as const).map((gender) => (
                            <button
                                key={gender}
                                type="button"
                                onClick={() => form.setData('gender', form.data.gender === gender ? '' : gender)}
                                className={cn(
                                    'rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                                    form.data.gender === gender
                                        ? 'border-primary-600 bg-primary-50 text-primary-800 dark:bg-primary-500/10 dark:text-primary-200'
                                        : 'border-line text-muted hover:border-line-strong',
                                )}
                            >
                                {labels.gender[gender]}
                            </button>
                        ))}
                    </div>
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                    <Field label={t('Password')} htmlFor="password" error={form.errors.password} required hint={t('At least 8 characters.')}>
                        <PasswordInput
                            id="password"
                            value={form.data.password}
                            onChange={(event) => form.setData('password', event.target.value)}
                            autoComplete="new-password"
                            aria-invalid={!!form.errors.password}
                        />
                    </Field>
                    <Field label={t('Confirm the password')} htmlFor="password_confirmation" error={form.errors.password_confirmation} required>
                        <PasswordInput
                            id="password_confirmation"
                            value={form.data.password_confirmation}
                            onChange={(event) => form.setData('password_confirmation', event.target.value)}
                            autoComplete="new-password"
                        />
                    </Field>
                </div>

                <div>
                    <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
                        <input
                            type="checkbox"
                            checked={form.data.terms}
                            onChange={(event) => form.setData('terms', event.target.checked)}
                            className="mt-0.5 size-4.5 shrink-0 cursor-pointer rounded-md border-line accent-primary-700"
                        />
                        <span>
                            {t('I agree to the')}{' '}
                            <Link href={route('site.terms')} target="_blank" className="font-semibold text-primary-700 hover:underline dark:text-primary-300">
                                {t('terms of use and privacy policy')}
                            </Link>
                        </span>
                    </label>
                    <FieldError message={form.errors.terms} />
                </div>

                <Button type="submit" size="lg" className="w-full" loading={form.processing}>
                    <UserPlus />
                    {t('Create the account')}
                </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
                {t('Already have an account?')}{' '}
                <Link href={route('login')} className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:underline dark:text-primary-300">
                    <LogIn className="size-4 rtl:rotate-180" />
                    {t('Sign in')}
                </Link>
            </p>
        </AuthLayout>
    );
}
