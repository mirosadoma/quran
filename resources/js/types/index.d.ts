export type Locale = 'ar' | 'en';
export type Role = 'admin' | 'teacher' | 'student';
export type Gender = 'male' | 'female';
export type HalaqaGender = 'male' | 'female' | 'mixed';
export type HalaqaLevel = 'beginner' | 'intermediate' | 'advanced';
export type SessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';
export type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';
export type ProgressType = 'memorization' | 'revision';
export type Grade = 'excellent' | 'very_good' | 'good' | 'acceptable' | 'weak';
export type MeetingProvider = 'google_meet' | 'zoom' | 'jitsi' | 'manual';
export type MessageType = 'text' | 'image' | 'audio' | 'file';

export interface AuthUser {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    role: Role;
    gender: Gender | null;
    avatar_url: string | null;
    timezone: string;
}

export interface RealtimeConfig {
    enabled: boolean;
    broadcaster?: 'pusher' | 'reverb';
    key?: string;
    cluster?: string;
    host?: string;
    port?: number;
    scheme?: string;
    halaqa_ids: number[];
}

export interface SharedProps {
    app: { name: string; tagline: string | null; logo_url: string | null };
    auth: { user: AuthUser | null };
    locale: Locale;
    timezone: string;
    csrf_token: string;
    counts: { notifications: number; chat: number } | null;
    realtime: RealtimeConfig;
    [key: string]: unknown;
}

export interface Toast {
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
}

export interface FlashData {
    toast?: Toast;
}

export interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

export interface Paginated<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    links: PaginationLink[];
    next_page_url: string | null;
    prev_page_url: string | null;
}

export interface UserRef {
    id: number;
    name: string;
    avatar_url?: string | null;
}

export interface HalaqaRef {
    id: number;
    name: string;
    color: string;
}

export interface UserItem extends UserRef {
    email: string | null;
    phone: string | null;
    role: Role;
    gender: Gender | null;
    avatar_url: string | null;
    is_active: boolean;
    memorized_ayahs: number;
    last_login_at: string | null;
    created_at: string | null;
    halaqat_count?: number;
    teaching_halaqat_count?: number;
    halaqat?: HalaqaRef[];
}

export interface UserDetails extends UserItem {
    birth_date: string | null;
    country: string | null;
    timezone: string;
    locale: Locale;
    bio: string | null;
    guardian_name: string | null;
    guardian_phone: string | null;
    zoom_user_id: string | null;
    admin_notes: string | null;
    notify_email: boolean;
    notify_whatsapp: boolean;
}

export interface ScheduleSlot {
    day: number;
    time: string;
}

export interface HalaqaItem extends HalaqaRef {
    description: string | null;
    gender: HalaqaGender;
    level: HalaqaLevel | null;
    capacity: number | null;
    duration_minutes: number;
    timezone: string;
    schedule: ScheduleSlot[];
    meeting_provider: MeetingProvider;
    starts_on: string | null;
    is_active: boolean;
    teacher?: UserRef | null;
    students_count?: number;
    next_session?: { id: number; starts_at: string; status: SessionStatus } | null;
    meeting_url?: string | null;
}

export interface SessionItem {
    id: number;
    title: string | null;
    display_title: string;
    starts_at: string;
    ends_at: string;
    duration_minutes: number;
    status: SessionStatus;
    source: 'schedule' | 'manual';
    meeting_provider: MeetingProvider;
    has_meeting: boolean;
    cancel_reason: string | null;
    halaqa?: HalaqaRef;
    teacher?: UserRef | null;
    attendances_count?: number;
    present_count?: number;
    my_attendance?: AttendanceStatus | null;
    can_join: boolean;
    can_manage: boolean;
}

export interface ProgressRecordItem {
    id: number;
    type: ProgressType;
    from_surah: number;
    from_ayah: number;
    to_surah: number;
    to_ayah: number;
    ayahs_count: number;
    grade: Grade | null;
    mistakes: number;
    notes: string | null;
    recorded_on: string;
    halaqa_id: number | null;
    halaqa_session_id: number | null;
    group_uuid: string | null;
    portions: ProgressPortion[];
    student?: UserRef;
    teacher?: UserRef | null;
    halaqa?: HalaqaRef | null;
    can_manage: boolean;
}

export interface QuranRange {
    from_surah: number;
    from_ayah: number;
    to_surah: number;
    to_ayah: number;
}

/**
 * One part (memorization or revision) of a recitation; both parts share the same record group.
 */
export interface ProgressPortion extends QuranRange {
    id: number;
    type: ProgressType;
    ayahs_count: number;
    grade: Grade | null;
    mistakes: number;
}

/**
 * A recitation entered by the student and waiting for the teacher's grading.
 */
export interface RecitationSubmissionItem {
    id: number;
    halaqa_id: number;
    memorization: QuranRange | null;
    revision: QuranRange | null;
    notes: string | null;
    submitted_at: string | null;
    student?: UserRef;
    halaqa?: HalaqaRef | null;
}

export interface MushafAyah {
    id: number;
    surah: number;
    ayah: number;
    text: string;
    juz: number;
    hizb_quarter: number;
    sajda: boolean;
}

export interface MushafIndex {
    surahs: Record<string, number>;
    juz: Record<string, number>;
    quarters: { quarter: number; surah: number; ayah: number; page: number }[];
    page_starts: number[];
}

export interface ReciterItem {
    id: number;
    name: string;
    name_en: string | null;
    description: string | null;
    audio_url: string;
}

export type HighlightColor = 'gold' | 'emerald' | 'sky' | 'rose' | 'violet';

export interface MushafBookmarkItem {
    id: number;
    page: number;
    ayah_id: number | null;
    surah: number | null;
    ayah: number | null;
    label: string | null;
    created_at: string | null;
}

export interface MushafHighlightItem {
    ayah_id: number;
    surah: number;
    ayah: number;
    page: number;
    color: HighlightColor;
    note: string | null;
    updated_at: string | null;
}

export interface DhikrItem {
    id: number;
    dhikr_category_id: number;
    title: string | null;
    text: string;
    repeat: number;
    reference: string | null;
    virtue: string | null;
    sort_order: number;
    is_active: boolean;
}

export interface DhikrCategoryItem {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    icon: string;
    color: string;
    sort_order: number;
    is_active: boolean;
    adhkar: DhikrItem[];
}

export type AnnouncementKind = 'advice' | 'word' | 'hadith' | 'reminder';
export type AnnouncementDelivery = 'now' | 'scheduled' | 'sessions';

export interface AnnouncementItem {
    id: number;
    kind: AnnouncementKind;
    title: string | null;
    body: string;
    delivery: AnnouncementDelivery;
    scheduled_at: string | null;
    sent_at: string | null;
    created_at: string | null;
    author?: UserRef | null;
    halaqa?: HalaqaRef | null;
    sessions?: { id: number; title: string; starts_at: string; cancelled: boolean; sent_at: string | null }[];
    can: { update: boolean; delete: boolean };
}

export interface VideoItem {
    id: number;
    title: string;
    description: string | null;
    url: string;
    youtube_id: string;
    thumbnail_url: string;
    is_published: boolean;
    halaqa_id: number | null;
    created_at: string | null;
    halaqa?: HalaqaRef | null;
    creator?: UserRef | null;
    can_manage: boolean;
}

export interface CoverageItem {
    number: number;
    covered: number;
    total: number;
}

export interface Coverage {
    ayahs: number;
    percent: number;
    completed_juz: number;
    completed_surahs: number;
    juz: CoverageItem[];
    surahs: CoverageItem[];
}

export interface AttendanceStats {
    total: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    rate: number | null;
}

export interface ProgressSummary {
    coverage: Coverage;
    average_score: number | null;
    average_grade: Grade | null;
    memorized_this_month: number;
    revised_this_month: number;
    records_count: number;
    last_record_on: string | null;
    attendance: AttendanceStats;
}

export interface ChatUser {
    id: number;
    name: string;
    role: Role;
    avatar_url: string | null;
}

export interface ChatMessage {
    id: number;
    halaqa_id: number;
    type: MessageType;
    body: string | null;
    attachment: { url: string; name: string | null; mime: string | null; size: number | null } | null;
    user: ChatUser | null;
    created_at: string;
}

export interface Conversation {
    id: number;
    name: string;
    color: string;
    is_active: boolean;
    teacher: string | null;
    members_count: number;
    unread: number;
    last_message: { preview: string; type: MessageType; user: string | null; created_at: string } | null;
}

export interface NotificationItem {
    id: string;
    title: string;
    body: string;
    url: string | null;
    icon: string;
    color: string;
    read_at: string | null;
    created_at: string | null;
}

export interface ProviderOption {
    value: MeetingProvider;
    label: string;
    configured: boolean;
}

export interface WeeklyMemorization {
    label: string;
    memorized: number;
    revised: number;
}

export interface WeeklyAttendance {
    label: string;
    rate: number | null;
    attended: number;
    absent: number;
}
