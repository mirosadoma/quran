import { Camera, Trash } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useTrans } from '@/lib/i18n';

interface AvatarUploadProps {
    name: string;
    currentUrl: string | null;
    file: File | null;
    removed: boolean;
    onChange: (file: File | null) => void;
    onRemove: () => void;
    error?: string;
}

export function AvatarUpload({ name, currentUrl, file, removed, onChange, onRemove, error }: AvatarUploadProps) {
    const { t } = useTrans();
    const input = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!file) {
            setPreview(null);

            return;
        }

        const url = URL.createObjectURL(file);
        setPreview(url);

        return () => URL.revokeObjectURL(url);
    }, [file]);

    const shown = preview ?? (removed ? null : currentUrl);

    return (
        <div className="flex items-center gap-4">
            <Avatar name={name || '?'} src={shown} size="xl" />
            <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => input.current?.click()}>
                        <Camera />
                        {shown ? t('Change photo') : t('Upload photo')}
                    </Button>
                    {shown && (
                        <Button variant="ghost" size="sm" onClick={onRemove}>
                            <Trash />
                            {t('Remove')}
                        </Button>
                    )}
                </div>
                <p className="text-xs text-muted">{t('JPG or PNG, up to 2 MB.')}</p>
                {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
            </div>
            <input
                ref={input}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                    onChange(event.target.files?.[0] ?? null);
                    event.target.value = '';
                }}
            />
        </div>
    );
}
