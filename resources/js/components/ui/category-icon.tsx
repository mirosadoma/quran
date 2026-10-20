import {
    BookOpen,
    CalendarDays,
    Compass,
    Feather,
    Gem,
    HandHeart,
    Heart,
    House,
    Landmark,
    Leaf,
    type LucideIcon,
    Moon,
    MoonStar,
    Quote,
    ScrollText,
    Shirt,
    Sparkles,
    Star,
    Sun,
    Users,
    Utensils,
} from 'lucide-react';

/**
 * The icons a category of content (sunnahs, sayings) may name: lucide names, any other falls back to sparkles.
 */
const icons: Record<string, LucideIcon> = {
    'book-open': BookOpen,
    'calendar-days': CalendarDays,
    compass: Compass,
    feather: Feather,
    gem: Gem,
    'hand-heart': HandHeart,
    heart: Heart,
    house: House,
    landmark: Landmark,
    leaf: Leaf,
    moon: Moon,
    'moon-star': MoonStar,
    quote: Quote,
    'scroll-text': ScrollText,
    shirt: Shirt,
    sparkles: Sparkles,
    star: Star,
    sun: Sun,
    users: Users,
    utensils: Utensils,
};

export function iconFor(name: string): LucideIcon {
    return icons[name] ?? Sparkles;
}

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
    const Icon = iconFor(name);

    return <Icon className={className} />;
}
