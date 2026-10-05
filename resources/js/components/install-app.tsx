import { CircleCheckBig, Download, Share, SquarePlus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useInstallPrompt } from '@/hooks/use-install-prompt';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';

/**
 * "Install app": the browser's install prompt, or the Add to Home Screen steps on iPhone and iPad.
 * Hidden once the app is installed or when the browser cannot install it.
 */
export function InstallAppButton({ className }: { className?: string }) {
    const { mode, install } = useInstallPrompt();
    const { t } = useTrans();
    const [showSteps, setShowSteps] = useState(false);

    if (!mode) {
        return null;
    }

    const onClick = async () => {
        if (mode === 'ios') {
            setShowSteps(true);

            return;
        }

        if (await install()) {
            toast.success(t('The app was installed.'));
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={onClick}
                title={t('Install app')}
                aria-label={t('Install app')}
                className={cn(
                    'inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-semibold text-primary-700 transition hover:bg-surface dark:text-primary-300',
                    className,
                )}
            >
                <Download className="size-4.5" />
                <span className="hidden sm:inline">{t('Install app')}</span>
            </button>
            {mode === 'ios' && <IosInstallSteps open={showSteps} onClose={() => setShowSteps(false)} />}
        </>
    );
}

function IosInstallSteps({ open, onClose }: { open: boolean; onClose: () => void }) {
    const { t } = useTrans();

    const steps = [
        { icon: Share, text: t('Tap the Share button in the browser toolbar.') },
        { icon: SquarePlus, text: t('Choose “Add to Home Screen”.') },
        { icon: CircleCheckBig, text: t('Tap “Add”. The app appears on your home screen.') },
    ];

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="sm"
            title={t('Install the app on your device')}
            description={t('Its own icon, full screen and faster to open.')}
            footer={<Button onClick={onClose}>{t('Got it')}</Button>}
        >
            <ol className="space-y-3">
                {steps.map((step, index) => (
                    <li key={index} className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                            <step.icon className="size-4.5" />
                        </span>
                        <span className="text-sm leading-relaxed text-ink">{step.text}</span>
                    </li>
                ))}
            </ol>
        </Modal>
    );
}
