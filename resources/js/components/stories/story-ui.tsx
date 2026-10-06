import {
    Anchor,
    Apple,
    Axe,
    Baby,
    Bird,
    BookHeart,
    BookOpen,
    Castle,
    Cat,
    Clock,
    CloudLightning,
    CloudRain,
    Crown,
    Droplets,
    Feather,
    Fish,
    Flame,
    Flower2,
    Footprints,
    Gem,
    Gift,
    Hammer,
    HandHeart,
    Handshake,
    Heart,
    Hourglass,
    House,
    Key,
    Lamp,
    Landmark,
    Leaf,
    Lightbulb,
    Moon,
    MoonStar,
    Mountain,
    Rainbow,
    Sailboat,
    Scale,
    ScrollText,
    Shell,
    Shield,
    ShieldCheck,
    Ship,
    Smile,
    Sparkles,
    Sprout,
    Star,
    Sun,
    Sunrise,
    Tent,
    TreePalm,
    Trees,
    Users,
    Utensils,
    Waves,
    Wheat,
    Wind,
    type LucideIcon,
} from 'lucide-react';
import { useTrans } from '@/lib/i18n';
import { arabicDigits } from '@/lib/quran';
import type { StoryKind, StoryTone } from '@/lib/stories';
import { cn } from '@/lib/utils';

/**
 * The icons a story file may name (lucide names); any other name falls back to a book or a scroll.
 */
const icons: Record<string, LucideIcon> = {
    anchor: Anchor,
    apple: Apple,
    axe: Axe,
    baby: Baby,
    bird: Bird,
    'book-heart': BookHeart,
    'book-open': BookOpen,
    castle: Castle,
    cat: Cat,
    'cloud-lightning': CloudLightning,
    'cloud-rain': CloudRain,
    crown: Crown,
    droplets: Droplets,
    feather: Feather,
    fish: Fish,
    flame: Flame,
    flower: Flower2,
    footprints: Footprints,
    gem: Gem,
    gift: Gift,
    hammer: Hammer,
    'hand-heart': HandHeart,
    handshake: Handshake,
    heart: Heart,
    hourglass: Hourglass,
    house: House,
    key: Key,
    lamp: Lamp,
    landmark: Landmark,
    leaf: Leaf,
    lightbulb: Lightbulb,
    moon: Moon,
    'moon-star': MoonStar,
    mountain: Mountain,
    rainbow: Rainbow,
    sailboat: Sailboat,
    scale: Scale,
    'scroll-text': ScrollText,
    shell: Shell,
    shield: Shield,
    'shield-check': ShieldCheck,
    ship: Ship,
    smile: Smile,
    sparkles: Sparkles,
    sprout: Sprout,
    star: Star,
    sun: Sun,
    sunrise: Sunrise,
    tent: Tent,
    'tree-palm': TreePalm,
    trees: Trees,
    users: Users,
    utensils: Utensils,
    waves: Waves,
    wheat: Wheat,
    wind: Wind,
};

export function StoryIcon({ name, kind, className }: { name: string | null; kind: StoryKind; className?: string }) {
    const Icon = (name ? icons[name] : undefined) ?? (kind === 'kids' ? BookHeart : ScrollText);

    return <Icon className={className} />;
}

/**
 * Colors of a story: soft chips, headings, the band of its card, its header (white text), and the paragraph being read.
 */
export const toneClasses: Record<StoryTone, { soft: string; text: string; band: string; solid: string; mark: string; hover: string }> = {
    emerald: {
        soft: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
        text: 'text-emerald-700 dark:text-emerald-300',
        band: 'from-emerald-400 to-teal-600',
        solid: 'from-emerald-600 to-teal-800',
        mark: 'bg-emerald-100/80 ring-emerald-300/80 dark:bg-emerald-500/15 dark:ring-emerald-400/30',
        hover: 'hover:border-emerald-300 dark:hover:border-emerald-500/40',
    },
    sky: {
        soft: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
        text: 'text-sky-700 dark:text-sky-300',
        band: 'from-sky-400 to-blue-600',
        solid: 'from-sky-600 to-blue-800',
        mark: 'bg-sky-100/80 ring-sky-300/80 dark:bg-sky-500/15 dark:ring-sky-400/30',
        hover: 'hover:border-sky-300 dark:hover:border-sky-500/40',
    },
    violet: {
        soft: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
        text: 'text-violet-700 dark:text-violet-300',
        band: 'from-violet-400 to-purple-600',
        solid: 'from-violet-600 to-purple-800',
        mark: 'bg-violet-100/80 ring-violet-300/80 dark:bg-violet-500/15 dark:ring-violet-400/30',
        hover: 'hover:border-violet-300 dark:hover:border-violet-500/40',
    },
    amber: {
        soft: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
        text: 'text-amber-700 dark:text-amber-300',
        band: 'from-amber-400 to-orange-500',
        solid: 'from-amber-600 to-orange-700',
        mark: 'bg-amber-100/80 ring-amber-300/80 dark:bg-amber-500/15 dark:ring-amber-400/30',
        hover: 'hover:border-amber-300 dark:hover:border-amber-500/40',
    },
    rose: {
        soft: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
        text: 'text-rose-700 dark:text-rose-300',
        band: 'from-rose-400 to-pink-600',
        solid: 'from-rose-600 to-pink-800',
        mark: 'bg-rose-100/80 ring-rose-300/80 dark:bg-rose-500/15 dark:ring-rose-400/30',
        hover: 'hover:border-rose-300 dark:hover:border-rose-500/40',
    },
    teal: {
        soft: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
        text: 'text-teal-700 dark:text-teal-300',
        band: 'from-teal-400 to-cyan-600',
        solid: 'from-teal-600 to-cyan-800',
        mark: 'bg-teal-100/80 ring-teal-300/80 dark:bg-teal-500/15 dark:ring-teal-400/30',
        hover: 'hover:border-teal-300 dark:hover:border-teal-500/40',
    },
};

/**
 * How long the story takes to read or to listen to.
 */
export function ReadingTime({ minutes, className }: { minutes: number; className?: string }) {
    const { t, locale } = useTrans();

    return (
        <span className={cn('inline-flex items-center gap-1', className)}>
            <Clock className="size-3.5 shrink-0" />
            {t(':count minutes', { count: locale === 'ar' ? arabicDigits(minutes) : minutes })}
        </span>
    );
}
