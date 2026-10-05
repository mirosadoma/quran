import { Eye, EyeOff } from 'lucide-react';
import { type ComponentProps, useState } from 'react';
import { inputClasses } from '@/components/ui/form';
import { useTrans } from '@/lib/i18n';
import { cn } from '@/lib/utils';

export function PasswordInput({ className, ...props }: Omit<ComponentProps<'input'>, 'type'>) {
    const [visible, setVisible] = useState(false);
    const { t } = useTrans();

    return (
        <div className="relative" dir="ltr">
            <input type={visible ? 'text' : 'password'} className={cn(inputClasses, 'pe-11', className)} {...props} />
            <button
                type="button"
                onClick={() => setVisible((value) => !value)}
                aria-label={visible ? t('Hide password') : t('Show password')}
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted transition hover:text-ink"
            >
                {visible ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
            </button>
        </div>
    );
}
