import { router, useForm } from '@inertiajs/react';
import { CirclePlay, EllipsisVertical, EyeOff, Globe, Pencil, Play, Trash } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownItem } from '@/components/ui/dropdown';
import { Checkbox, Field, Input, Select, Switch, Textarea } from '@/components/ui/form';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import { useDates } from '@/lib/dates';
import { useTrans } from '@/lib/i18n';
import { cn, colorOf } from '@/lib/utils';
import type { HalaqaRef, VideoItem } from '@/types';

export function VideoCard({ video, onPlay, onEdit }: { video: VideoItem; onPlay: () => void; onEdit?: () => void }) {
    const { t } = useTrans();
    const dates = useDates();
    const [deleting, setDeleting] = useState(false);

    return (
        <div className="group overflow-hidden rounded-2xl border border-line bg-surface transition hover:shadow-lg hover:shadow-primary-950/5">
            <button type="button" onClick={onPlay} className="relative block aspect-video w-full overflow-hidden bg-primary-950">
                <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    loading="lazy"
                    className="size-full object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-linear-to-t from-black/50 via-black/0 to-black/0" />
                <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex size-14 items-center justify-center rounded-full bg-white/90 text-primary-800 shadow-xl transition group-hover:scale-110">
                        <Play className="ms-1 size-6 fill-current rtl:ms-0 rtl:me-1 rtl:rotate-180" />
                    </span>
                </span>
                {!video.is_published && (
                    <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white">
                        <EyeOff className="size-3.5" />
                        {t('Hidden')}
                    </span>
                )}
            </button>
            <div className="flex gap-3 p-4">
                <div className="min-w-0 flex-1">
                    <button type="button" onClick={onPlay} className="line-clamp-2 text-start font-semibold leading-snug text-ink hover:text-primary-700 dark:hover:text-primary-300">
                        {video.title}
                    </button>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        {video.halaqa ? (
                            <span className="inline-flex items-center gap-1.5">
                                <span className={cn('size-2 rounded-full', colorOf(video.halaqa.color).dot)} />
                                {video.halaqa.name}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1">
                                <Globe className="size-3.5" />
                                {t('General library')}
                            </span>
                        )}
                        {video.created_at && <span>{dates.date(video.created_at)}</span>}
                    </div>
                </div>
                {video.can_manage && (
                    <Dropdown
                        trigger={
                            <Button variant="ghost" size="icon-sm" aria-label={t('Options')}>
                                <EllipsisVertical />
                            </Button>
                        }
                        className="w-44"
                    >
                        {onEdit && (
                            <DropdownItem icon={Pencil} onClick={onEdit}>
                                {t('Edit')}
                            </DropdownItem>
                        )}
                        <DropdownItem icon={Trash} danger onClick={() => setDeleting(true)}>
                            {t('Delete')}
                        </DropdownItem>
                    </Dropdown>
                )}
            </div>

            <ConfirmDialog
                open={deleting}
                onClose={() => setDeleting(false)}
                onConfirm={() => router.delete(route('videos.destroy', video.id), { preserveScroll: true, onFinish: () => setDeleting(false) })}
                title={t('Delete this video?')}
                message={video.title}
                confirmLabel={t('Delete')}
            />
        </div>
    );
}

export function VideoPlayer({ video, onClose }: { video: VideoItem | null; onClose: () => void }) {
    return (
        <Modal open={video !== null} onClose={onClose} size="xl" title={video?.title} description={video?.halaqa?.name}>
            {video && (
                <div className="-mx-5 -mt-5 sm:-mx-6">
                    <div className="aspect-video w-full bg-black">
                        <iframe
                            key={video.youtube_id}
                            src={`https://www.youtube-nocookie.com/embed/${video.youtube_id}?autoplay=1&rel=0&modestbranding=1`}
                            title={video.title}
                            className="size-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                        />
                    </div>
                    {video.description && <p dir="auto" className="px-5 pt-4 text-sm leading-relaxed text-ink/85 whitespace-pre-line sm:px-6">{video.description}</p>}
                </div>
            )}
        </Modal>
    );
}

interface VideoFormProps {
    open: boolean;
    onClose: () => void;
    video?: VideoItem | null;
    halaqat: HalaqaRef[];
    allowGeneral: boolean;
    defaultHalaqaId?: number | null;
}

export function VideoForm({ open, onClose, video, halaqat, allowGeneral, defaultHalaqaId }: VideoFormProps) {
    const { t } = useTrans();
    const form = useForm({
        title: '',
        url: '',
        halaqa_id: '' as number | '',
        description: '',
        is_published: true,
        notify: true,
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.clearErrors();
        form.setData({
            title: video?.title ?? '',
            url: video?.url ?? '',
            halaqa_id: video ? (video.halaqa_id ?? '') : (defaultHalaqaId ?? (allowGeneral ? '' : (halaqat[0]?.id ?? ''))),
            description: video?.description ?? '',
            is_published: video?.is_published ?? true,
            notify: !video,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, video?.id]);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const options = { preserveScroll: true, onSuccess: () => onClose() };

        if (video) {
            form.put(route('videos.update', video.id), options);
        } else {
            form.post(route('videos.store'), options);
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={video ? t('Edit video') : t('Add a video')}
            description={t('Paste any YouTube link: watch, youtu.be, shorts or live.')}
            footer={
                <>
                    <Button variant="secondary" onClick={onClose}>
                        {t('Cancel')}
                    </Button>
                    <Button type="submit" form="video-form" loading={form.processing}>
                        <CirclePlay />
                        {video ? t('Save changes') : t('Add the video')}
                    </Button>
                </>
            }
        >
            <form id="video-form" onSubmit={submit} className="space-y-4">
                <Field label={t('YouTube link')} error={form.errors.url} required>
                    <Input
                        dir="ltr"
                        value={form.data.url}
                        onChange={(event) => form.setData('url', event.target.value)}
                        placeholder="https://www.youtube.com/watch?v=..."
                        aria-invalid={!!form.errors.url}
                    />
                </Field>
                <Field label={t('Title')} error={form.errors.title} required>
                    <Input value={form.data.title} onChange={(event) => form.setData('title', event.target.value)} aria-invalid={!!form.errors.title} />
                </Field>
                <Field label={t('Visible to')} error={form.errors.halaqa_id}>
                    <Select
                        value={form.data.halaqa_id}
                        onChange={(event) => form.setData('halaqa_id', event.target.value === '' ? '' : Number(event.target.value))}
                    >
                        {allowGeneral && <option value="">{t('All students (general library)')}</option>}
                        {halaqat.map((halaqa) => (
                            <option key={halaqa.id} value={halaqa.id}>
                                {halaqa.name}
                            </option>
                        ))}
                    </Select>
                </Field>
                <Field label={t('Description')} error={form.errors.description}>
                    <Textarea value={form.data.description} onChange={(event) => form.setData('description', event.target.value)} />
                </Field>
                <Switch
                    checked={form.data.is_published}
                    onChange={(value) => form.setData('is_published', value)}
                    label={t('Published')}
                    description={t('Hidden videos are visible to teachers and admins only.')}
                />
                {form.data.is_published && (!video || !video.is_published) && (
                    <Checkbox
                        label={t('Notify the students')}
                        checked={form.data.notify}
                        onChange={(event) => form.setData('notify', event.target.checked)}
                    />
                )}
            </form>
        </Modal>
    );
}
