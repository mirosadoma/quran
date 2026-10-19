import { localized, type Localized } from '@/lib/prayers';
import type { Locale } from '@/types';

/**
 * The Kaaba: every bearing on the qibla page leads here.
 */
export const KAABA = { lat: 21.422487, lng: 39.826206 } as const;

/** Mean radius of the Earth (IUGG), in kilometres. */
const EARTH_RADIUS_KM = 6371.0088;

/** Within this many degrees of the qibla the phone counts as facing it. */
export const QIBLA_TOLERANCE_DEGREES = 3;

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface City extends Coordinates {
    id: string;
    name: Localized;
    country: Localized;
}

function toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
}

/**
 * Bring any angle into 0..360.
 */
export function normalizeDegrees(degrees: number): number {
    return ((degrees % 360) + 360) % 360;
}

/**
 * The shortest signed turn from one angle to another, in -180..180 (positive = clockwise).
 */
export function angleDifference(from: number, to: number): number {
    return normalizeDegrees(to - from + 180) - 180;
}

/**
 * The initial great-circle bearing from a point to the Kaaba, clockwise from true north (0..360).
 */
export function qiblaBearing(lat: number, lng: number): number {
    const fromLat = toRadians(lat);
    const toLat = toRadians(KAABA.lat);
    const deltaLng = toRadians(KAABA.lng - lng);
    const y = Math.sin(deltaLng) * Math.cos(toLat);
    const x = Math.cos(fromLat) * Math.sin(toLat) - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLng);

    return normalizeDegrees(toDegrees(Math.atan2(y, x)));
}

/**
 * The great-circle (haversine) distance from a point to the Kaaba, in kilometres.
 */
export function distanceToKaabaKm(lat: number, lng: number): number {
    const fromLat = toRadians(lat);
    const toLat = toRadians(KAABA.lat);
    const deltaLat = toRadians(KAABA.lat - lat);
    const deltaLng = toRadians(KAABA.lng - lng);
    const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;

    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Is the phone, pointing at `heading`, facing the qibla at `bearing`?
 */
export function isFacingQibla(heading: number | null, bearing: number | null): boolean {
    return heading !== null && bearing !== null && Math.abs(angleDifference(heading, bearing)) <= QIBLA_TOLERANCE_DEGREES;
}

/** The 16 points of the compass, clockwise from north; each is a translation key. */
export const compassPoints = [
    'North',
    'North-northeast',
    'Northeast',
    'East-northeast',
    'East',
    'East-southeast',
    'Southeast',
    'South-southeast',
    'South',
    'South-southwest',
    'Southwest',
    'West-southwest',
    'West',
    'West-northwest',
    'Northwest',
    'North-northwest',
] as const;

export type CompassPoint = (typeof compassPoints)[number];

/**
 * The nearest of the 16 compass points to a bearing.
 */
export function compassDirectionLabel(bearing: number): CompassPoint {
    return compassPoints[Math.round(normalizeDegrees(bearing) / 22.5) % compassPoints.length];
}

/** The letters printed on the dial: north, east, south, west. */
export const compassLetters: Record<Locale, [string, string, string, string]> = {
    ar: ['ش', 'ق', 'ج', 'غ'],
    en: ['N', 'E', 'S', 'W'],
};

export function isValidLatitude(value: number): boolean {
    return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
    return Number.isFinite(value) && value >= -180 && value <= 180;
}

/**
 * Coordinates as "30.0444, 31.2357" (four decimals: about ten metres).
 */
export function formatCoordinates({ lat, lng }: Coordinates): string {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

/**
 * Major cities to pick from when the device cannot tell where it is.
 */
export const cities: City[] = [
    { id: 'cairo', name: { ar: 'القاهرة', en: 'Cairo' }, country: { ar: 'مصر', en: 'Egypt' }, lat: 30.0444, lng: 31.2357 },
    { id: 'alexandria', name: { ar: 'الإسكندرية', en: 'Alexandria' }, country: { ar: 'مصر', en: 'Egypt' }, lat: 31.2001, lng: 29.9187 },
    { id: 'giza', name: { ar: 'الجيزة', en: 'Giza' }, country: { ar: 'مصر', en: 'Egypt' }, lat: 30.0131, lng: 31.2089 },
    { id: 'riyadh', name: { ar: 'الرياض', en: 'Riyadh' }, country: { ar: 'السعودية', en: 'Saudi Arabia' }, lat: 24.7136, lng: 46.6753 },
    { id: 'jeddah', name: { ar: 'جدة', en: 'Jeddah' }, country: { ar: 'السعودية', en: 'Saudi Arabia' }, lat: 21.4858, lng: 39.1925 },
    { id: 'makkah', name: { ar: 'مكة المكرمة', en: 'Makkah' }, country: { ar: 'السعودية', en: 'Saudi Arabia' }, lat: 21.3891, lng: 39.8579 },
    { id: 'madinah', name: { ar: 'المدينة المنورة', en: 'Madinah' }, country: { ar: 'السعودية', en: 'Saudi Arabia' }, lat: 24.5247, lng: 39.5692 },
    { id: 'dubai', name: { ar: 'دبي', en: 'Dubai' }, country: { ar: 'الإمارات', en: 'United Arab Emirates' }, lat: 25.2048, lng: 55.2708 },
    { id: 'abu-dhabi', name: { ar: 'أبوظبي', en: 'Abu Dhabi' }, country: { ar: 'الإمارات', en: 'United Arab Emirates' }, lat: 24.4539, lng: 54.3773 },
    { id: 'doha', name: { ar: 'الدوحة', en: 'Doha' }, country: { ar: 'قطر', en: 'Qatar' }, lat: 25.2854, lng: 51.531 },
    { id: 'kuwait', name: { ar: 'مدينة الكويت', en: 'Kuwait City' }, country: { ar: 'الكويت', en: 'Kuwait' }, lat: 29.3759, lng: 47.9774 },
    { id: 'manama', name: { ar: 'المنامة', en: 'Manama' }, country: { ar: 'البحرين', en: 'Bahrain' }, lat: 26.2285, lng: 50.586 },
    { id: 'muscat', name: { ar: 'مسقط', en: 'Muscat' }, country: { ar: 'عُمان', en: 'Oman' }, lat: 23.588, lng: 58.3829 },
    { id: 'amman', name: { ar: 'عمّان', en: 'Amman' }, country: { ar: 'الأردن', en: 'Jordan' }, lat: 31.9454, lng: 35.9284 },
    { id: 'beirut', name: { ar: 'بيروت', en: 'Beirut' }, country: { ar: 'لبنان', en: 'Lebanon' }, lat: 33.8938, lng: 35.5018 },
    { id: 'damascus', name: { ar: 'دمشق', en: 'Damascus' }, country: { ar: 'سوريا', en: 'Syria' }, lat: 33.5138, lng: 36.2765 },
    { id: 'baghdad', name: { ar: 'بغداد', en: 'Baghdad' }, country: { ar: 'العراق', en: 'Iraq' }, lat: 33.3152, lng: 44.3661 },
    { id: 'khartoum', name: { ar: 'الخرطوم', en: 'Khartoum' }, country: { ar: 'السودان', en: 'Sudan' }, lat: 15.5007, lng: 32.5599 },
    { id: 'tripoli', name: { ar: 'طرابلس', en: 'Tripoli' }, country: { ar: 'ليبيا', en: 'Libya' }, lat: 32.8872, lng: 13.1913 },
    { id: 'tunis', name: { ar: 'تونس', en: 'Tunis' }, country: { ar: 'تونس', en: 'Tunisia' }, lat: 36.8065, lng: 10.1815 },
    { id: 'algiers', name: { ar: 'الجزائر', en: 'Algiers' }, country: { ar: 'الجزائر', en: 'Algeria' }, lat: 36.7538, lng: 3.0588 },
    { id: 'casablanca', name: { ar: 'الدار البيضاء', en: 'Casablanca' }, country: { ar: 'المغرب', en: 'Morocco' }, lat: 33.5731, lng: -7.5898 },
    { id: 'rabat', name: { ar: 'الرباط', en: 'Rabat' }, country: { ar: 'المغرب', en: 'Morocco' }, lat: 34.0209, lng: -6.8416 },
    { id: 'sanaa', name: { ar: 'صنعاء', en: 'Sanaa' }, country: { ar: 'اليمن', en: 'Yemen' }, lat: 15.3694, lng: 44.191 },
    { id: 'istanbul', name: { ar: 'إسطنبول', en: 'Istanbul' }, country: { ar: 'تركيا', en: 'Turkey' }, lat: 41.0082, lng: 28.9784 },
    { id: 'jakarta', name: { ar: 'جاكرتا', en: 'Jakarta' }, country: { ar: 'إندونيسيا', en: 'Indonesia' }, lat: -6.2088, lng: 106.8456 },
    { id: 'kuala-lumpur', name: { ar: 'كوالالمبور', en: 'Kuala Lumpur' }, country: { ar: 'ماليزيا', en: 'Malaysia' }, lat: 3.139, lng: 101.6869 },
    { id: 'karachi', name: { ar: 'كراتشي', en: 'Karachi' }, country: { ar: 'باكستان', en: 'Pakistan' }, lat: 24.8607, lng: 67.0011 },
    { id: 'london', name: { ar: 'لندن', en: 'London' }, country: { ar: 'المملكة المتحدة', en: 'United Kingdom' }, lat: 51.5074, lng: -0.1278 },
    { id: 'paris', name: { ar: 'باريس', en: 'Paris' }, country: { ar: 'فرنسا', en: 'France' }, lat: 48.8566, lng: 2.3522 },
    { id: 'berlin', name: { ar: 'برلين', en: 'Berlin' }, country: { ar: 'ألمانيا', en: 'Germany' }, lat: 52.52, lng: 13.405 },
    { id: 'new-york', name: { ar: 'نيويورك', en: 'New York' }, country: { ar: 'الولايات المتحدة', en: 'United States' }, lat: 40.7128, lng: -74.006 },
    { id: 'toronto', name: { ar: 'تورونتو', en: 'Toronto' }, country: { ar: 'كندا', en: 'Canada' }, lat: 43.6532, lng: -79.3832 },
];

export function findCity(id: string | null): City | undefined {
    return id ? cities.find((city) => city.id === id) : undefined;
}

export function cityLabel(city: City, locale: Locale): string {
    return `${localized(city.name, locale)} — ${localized(city.country, locale)}`;
}

/**
 * The cities sorted by their name in the user's language.
 */
export function sortedCities(locale: Locale): City[] {
    return [...cities].sort((a, b) => localized(a.name, locale).localeCompare(localized(b.name, locale), locale));
}

/**
 * Does the profile's free-text country name this city's country, in either language?
 */
export function isInCountry(city: City, country: string | null): boolean {
    const needle = country?.trim().toLowerCase();

    if (!needle) {
        return false;
    }

    return [city.country.ar, city.country.en].some((name) => needle === name.toLowerCase() || needle.includes(name.toLowerCase()));
}
