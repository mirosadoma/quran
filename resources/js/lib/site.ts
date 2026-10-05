import {
    BadgeCheck,
    Bell,
    BookOpen,
    BookOpenCheck,
    BookOpenText,
    Building2,
    CalendarDays,
    ChartColumn,
    CirclePlay,
    GraduationCap,
    HandHeart,
    HeartHandshake,
    Inbox,
    LayoutDashboard,
    MessagesSquare,
    Mic,
    MoonStar,
    Scale,
    School,
    Settings,
    ShieldCheck,
    Smartphone,
    Smile,
    Sparkles,
    UserPlus,
    UserRound,
    Users,
    Video,
    type LucideIcon,
} from 'lucide-react';
import data from '../../data/site.json';
import type { Tone } from '@/lib/labels';
import type { Localized } from '@/lib/prayers';

export interface SiteFeature {
    icon: string;
    tone: Tone;
    title: Localized;
    text: Localized;
}

export interface SiteAudience {
    icon: string;
    title: Localized;
    text: Localized;
    points: Localized[];
}

export interface SiteStep {
    title: Localized;
    text: Localized;
}

export interface FaqCategory {
    category: Localized;
    items: { q: Localized; a: Localized }[];
}

export interface TermsSection {
    id: string;
    title: Localized;
    paragraphs: Localized[];
}

export type GuideRole = 'everyone' | 'student' | 'teacher' | 'manager' | 'admin';

export interface GuideSection {
    role: GuideRole;
    title: Localized;
    intro: Localized;
    tabs: { icon: string; title: Localized; text: Localized; points?: Localized[] }[];
}

interface SiteContent {
    features: SiteFeature[];
    audiences: SiteAudience[];
    steps: SiteStep[];
    about: {
        story: Localized[];
        mission: Localized;
        vision: Localized;
        values: { icon: string; title: Localized; text: Localized }[];
    };
    faq: FaqCategory[];
    terms: TermsSection[];
    guide: GuideSection[];
}

/**
 * The texts of the public website, in Arabic and English (resources/data/site.json).
 */
export const site = data as SiteContent;

const icons: Record<string, LucideIcon> = {
    'badge-check': BadgeCheck,
    bell: Bell,
    'book-open': BookOpen,
    'book-open-check': BookOpenCheck,
    'book-open-text': BookOpenText,
    'building-2': Building2,
    'calendar-days': CalendarDays,
    'chart-column': ChartColumn,
    'circle-play': CirclePlay,
    'graduation-cap': GraduationCap,
    'hand-heart': HandHeart,
    'heart-handshake': HeartHandshake,
    inbox: Inbox,
    'layout-dashboard': LayoutDashboard,
    'messages-square': MessagesSquare,
    mic: Mic,
    'moon-star': MoonStar,
    scale: Scale,
    school: School,
    settings: Settings,
    'shield-check': ShieldCheck,
    smartphone: Smartphone,
    smile: Smile,
    sparkles: Sparkles,
    'user-plus': UserPlus,
    'user-round': UserRound,
    users: Users,
    video: Video,
};

export function siteIcon(name: string): LucideIcon {
    return icons[name] ?? Sparkles;
}
