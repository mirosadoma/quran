import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { TriangleAlert, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button, type ButtonVariant } from '@/components/ui/button';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const sizes = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
} as const;

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: ReactNode;
    description?: ReactNode;
    size?: keyof typeof sizes;
    footer?: ReactNode;
    children: ReactNode;
    className?: string;
}

export function Modal({ open, onClose, title, description, size = 'md', footer, children, className }: ModalProps) {
    const { t } = useTrans();

    return (
        <Dialog open={open} onClose={onClose} className="relative z-50">
            <DialogBackdrop
                transition
                className="fixed inset-0 bg-primary-950/45 backdrop-blur-[2px] transition duration-200 data-closed:opacity-0"
            />
            <div className="fixed inset-0 overflow-y-auto">
                <div className="flex min-h-full items-end justify-center sm:items-center sm:p-4">
                    <DialogPanel
                        transition
                        className={cn(
                            'w-full rounded-t-3xl bg-surface shadow-2xl ring-1 ring-line transition duration-200 sm:rounded-3xl',
                            'data-closed:translate-y-6 data-closed:opacity-0 sm:data-closed:translate-y-0 sm:data-closed:scale-95',
                            sizes[size],
                            className,
                        )}
                    >
                        {title && (
                            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
                                <div className="min-w-0">
                                    <DialogTitle className="text-lg font-bold text-ink">{title}</DialogTitle>
                                    {description && <p className="mt-1 text-sm text-muted">{description}</p>}
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    aria-label={t('Close')}
                                    className="-me-1 rounded-lg p-1.5 text-muted transition hover:bg-surface-muted hover:text-ink"
                                >
                                    <X className="size-5" />
                                </button>
                            </div>
                        )}
                        <div className="max-h-[75dvh] overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
                        {footer && (
                            <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                                {footer}
                            </div>
                        )}
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    );
}

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: ReactNode;
    message?: ReactNode;
    confirmLabel?: string;
    variant?: ButtonVariant;
    processing?: boolean;
    children?: ReactNode;
}

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel,
    variant = 'danger',
    processing = false,
    children,
}: ConfirmDialogProps) {
    const { t } = useTrans();

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="sm"
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button variant={variant} onClick={onConfirm} loading={processing}>
                        {confirmLabel ?? t('Confirm')}
                    </Button>
                </>
            }
        >
            <div className="flex gap-4">
                <span
                    className={cn(
                        'flex size-11 shrink-0 items-center justify-center rounded-2xl',
                        variant === 'danger' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' : 'bg-gold-50 text-gold-600 dark:bg-gold-500/10',
                    )}
                >
                    <TriangleAlert className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <DialogTitle className="text-base font-bold text-ink">{title}</DialogTitle>
                    {message && <p className="mt-1.5 text-sm leading-relaxed text-muted">{message}</p>}
                    {children && <div className="mt-4">{children}</div>}
                </div>
            </div>
        </Modal>
    );
}
