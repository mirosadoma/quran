import { router } from '@inertiajs/react';
import { CircleX, FileVideo, Trash, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/modal';
import { http } from '@/lib/http';
import { useTrans } from '@/lib/i18n';
import { formatBytes } from '@/lib/utils';

export interface RecordingUploadOptions {
    chunk_size: number;
    max_bytes: number;
    extensions: string[];
}

interface RecordingUploadProps {
    sessionId: number;
    options: RecordingUploadOptions;
    /** The session already has an uploaded recording. */
    hasFile: boolean;
}

/**
 * Uploads the video of a session from the teacher's device in chunks, with a progress bar,
 * so even a long recording of hundreds of megabytes arrives safely.
 */
export function RecordingUpload({ sessionId, options, hasFile }: RecordingUploadProps) {
    const { t } = useTrans();
    const input = useRef<HTMLInputElement>(null);
    const abort = useRef<AbortController | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState<number | null>(null);
    const [removing, setRemoving] = useState(false);
    const [processing, setProcessing] = useState(false);

    const accept = options.extensions.map((extension) => `.${extension}`).join(',');

    const choose = (chosen: File | null) => {
        if (!chosen) {
            return;
        }

        const extension = chosen.name.split('.').pop()?.toLowerCase() ?? '';

        if (!options.extensions.includes(extension)) {
            toast.error(t('Choose a video file (:extensions).', { extensions: options.extensions.join(', ') }));

            return;
        }

        if (chosen.size > options.max_bytes) {
            toast.error(t('The video is larger than :max MB.', { max: Math.floor(options.max_bytes / 1024 / 1024) }));

            return;
        }

        setFile(chosen);
    };

    const upload = async () => {
        if (!file) {
            return;
        }

        const controller = new AbortController();
        abort.current = controller;
        setProgress(0);

        const uploadId = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9-]/g, '');
        const total = Math.max(1, Math.ceil(file.size / options.chunk_size));

        try {
            for (let index = 0; index < total; index++) {
                const start = index * options.chunk_size;
                const chunk = file.slice(start, Math.min(file.size, start + options.chunk_size));
                const body = new FormData();

                body.append('upload_id', uploadId);
                body.append('index', String(index));
                body.append('total', String(total));
                body.append('size', String(file.size));
                body.append('name', file.name);
                body.append('chunk', chunk, file.name);

                await http.post(route('sessions.recording.chunks', sessionId), body, {
                    signal: controller.signal,
                    onUploadProgress: (event) => {
                        const sent = start + (event.loaded ?? 0);
                        setProgress(Math.min(99, Math.round((sent / file.size) * 100)));
                    },
                });
            }

            setProgress(100);
            toast.success(t('The recording was uploaded. Students can watch it now.'));
            setFile(null);
            router.reload({ only: ['session'] });
        } catch (error) {
            if (controller.signal.aborted) {
                toast(t('Upload cancelled.'));
            } else {
                const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
                toast.error(message || t('The upload failed. Check your connection and try again.'));
            }
        } finally {
            abort.current = null;
            setProgress(null);

            if (input.current) {
                input.current.value = '';
            }
        }
    };

    const remove = () => {
        router.delete(route('sessions.recording.destroy', sessionId), {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => {
                setProcessing(false);
                setRemoving(false);
            },
        });
    };

    const uploading = progress !== null;

    return (
        <div className="space-y-3">
            <input ref={input} type="file" accept={accept} className="hidden" onChange={(event) => choose(event.target.files?.[0] ?? null)} />

            {file ? (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface-muted/60 px-4 py-3">
                    <FileVideo className="size-5 shrink-0 text-primary-600" />
                    <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink" dir="auto">
                            {file.name}
                        </span>
                        <span className="block text-xs text-muted">{formatBytes(file.size)}</span>
                    </span>
                    {uploading ? (
                        <Button size="sm" variant="secondary" onClick={() => abort.current?.abort()}>
                            <CircleX />
                            {t('Cancel')}
                        </Button>
                    ) : (
                        <>
                            <Button size="sm" variant="ghost" onClick={() => setFile(null)}>
                                {t('Cancel')}
                            </Button>
                            <Button size="sm" onClick={upload}>
                                <Upload />
                                {t('Upload')}
                            </Button>
                        </>
                    )}
                    {uploading && (
                        <div className="basis-full">
                            <div className="h-2 overflow-hidden rounded-full bg-line">
                                <div className="h-full rounded-full bg-primary-600 transition-[width]" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="mt-1 text-xs text-muted">{t('Uploading... :percent%', { percent: progress })}</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" onClick={() => input.current?.click()}>
                        <Upload />
                        {hasFile ? t('Replace the video') : t('Upload the recording video')}
                    </Button>
                    {hasFile && (
                        <Button variant="ghost" className="hover:text-rose-600" onClick={() => setRemoving(true)}>
                            <Trash />
                            {t('Remove the video')}
                        </Button>
                    )}
                    <span className="basis-full text-xs text-muted">
                        {t('MP4 or WebM up to :max MB. The video plays inside the platform in the halaqa recordings.', { max: Math.floor(options.max_bytes / 1024 / 1024) })}
                    </span>
                </div>
            )}

            <ConfirmDialog
                open={removing}
                onClose={() => setRemoving(false)}
                onConfirm={remove}
                processing={processing}
                title={t('Remove the recording video?')}
                message={t('Students will no longer be able to watch it.')}
                confirmLabel={t('Remove')}
            />
        </div>
    );
}
