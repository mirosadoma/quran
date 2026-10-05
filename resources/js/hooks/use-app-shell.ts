import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Show toasts flashed by the server (Inertia::flash('toast', ...)).
 */
export function useFlashToasts(): void {
    const { flash } = usePage();

    useEffect(() => {
        const message = flash?.toast;

        if (!message) {
            return;
        }

        const show = { success: toast.success, error: toast.error, warning: toast.warning, info: toast.info }[message.type] ?? toast;
        show(message.message);
    }, [flash]);
}

/**
 * Keep <html lang/dir> in sync with the interface language.
 */
export function useDocumentDirection(): void {
    const { locale } = usePage().props;

    useEffect(() => {
        document.documentElement.lang = locale;
        document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    }, [locale]);
}
