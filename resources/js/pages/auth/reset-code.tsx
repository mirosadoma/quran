import { Link, useForm } from '@inertiajs/react';
import { ArrowRight, RotateCw, ShieldCheck } from 'lucide-react';
import { type FormEvent, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { CodeInput } from '@/components/ui/code-input';
import { FieldError, Label } from '@/components/ui/form';
import { useCountdown } from '@/hooks/use-countdown';
import AuthLayout from '@/layouts/auth-layout';
import { useTrans } from '@/lib/i18n';

interface ResetCodeProps {
    email: string;
    status?: string | null;
    /** The email could not leave: the administration can give the code. */
    warning?: string | null;
    /** When a new code may be asked for (null: now). */
    resendAt: string | null;
    /** How long a code lasts. */
    minutes: number;
}

const LENGTH = 6;

/**
 * The second step of "Forgot your password?": the code sent by email, then the page of the new password.
 */
export default function ResetCode({ email, status, warning, resendAt, minutes }: ResetCodeProps) {
    const { t } = useTrans();
    const form = useForm({ code: '' });
    const resendForm = useForm({});
    const countdown = useCountdown(resendAt);

    const submit = (event?: FormEvent) => {
        event?.preventDefault();

        if (form.data.code.length === LENGTH && !form.processing) {
            form.post(route('password.code.verify'), { preserveScroll: true, onError: () => form.setData('code', '') });
        }
    };

    // The last digit sends the code at once.
    useEffect(() => {
        if (form.data.code.length === LENGTH) {
            submit();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.data.code]);

    const resend = () =>
        resendForm.post(route('password.code.resend'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                form.clearErrors();
            },
        });

    return (
        <AuthLayout
            title={t('Enter the code')}
            subtitle={
                <>
                    {t('We sent a code of 6 digits to')}{' '}
                    <span className="font-semibold text-ink" dir="ltr">
                        {email}
                    </span>
                    . {t('It lasts :count minutes.', { count: minutes })}
                </>
            }
        >
            {status && (
                <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                    {status}
                </div>
            )}

            {warning && (
                <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                    {warning}
                </div>
            )}

            <form onSubmit={submit} className="space-y-5">
                <div>
                    <Label htmlFor="code">{t('The code')}</Label>
                    <CodeInput id="code" value={form.data.code} onChange={(code) => form.setData('code', code)} invalid={!!form.errors.code} disabled={form.processing} autoFocus />
                    <FieldError message={form.errors.code ?? (resendForm.errors as { code?: string }).code} />
                </div>

                <Button type="submit" size="lg" className="w-full" loading={form.processing} disabled={form.data.code.length < LENGTH}>
                    <ShieldCheck />
                    {t('Confirm the code')}
                </Button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-2 text-sm text-muted">
                <p>{t("Didn't get the code? Check the spam folder.")}</p>
                <button
                    type="button"
                    onClick={resend}
                    disabled={!countdown.done || resendForm.processing}
                    className="inline-flex items-center gap-1.5 font-semibold text-primary-700 hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline dark:text-primary-300"
                >
                    <RotateCw className={resendForm.processing ? 'size-4 animate-spin' : 'size-4'} />
                    {countdown.done ? t('Send a new code') : t('Send a new code in :seconds s', { seconds: countdown.totalSeconds })}
                </button>
            </div>

            <Link href={route('password.request')} className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:underline dark:text-primary-300">
                <ArrowRight className="size-4 ltr:rotate-180" />
                {t('Use another email')}
            </Link>
        </AuthLayout>
    );
}
