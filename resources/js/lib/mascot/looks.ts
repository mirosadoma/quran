/**
 * The looks of the companion: a small lantern of light with a friendly face. Every color is a CSS variable of the
 * theme (resources/css/app.css), so the looks follow the light and the dark modes.
 */
export type MascotHalo = 'gold' | 'emerald' | 'sky' | 'violet';
export type MascotBody = 'round' | 'tall' | 'wide';
export type MascotEyes = 'open' | 'smile' | 'wink' | 'pensive' | 'sleepy';
export type MascotAccessory = 'none' | 'beads' | 'crescent' | 'sparkles' | 'book';

export interface MascotLook {
    halo: MascotHalo;
    body: MascotBody;
    eyes: MascotEyes;
    accessory: MascotAccessory;
}

export const MASCOT_LOOKS: MascotLook[] = [
    { halo: 'gold', body: 'round', eyes: 'smile', accessory: 'none' },
    { halo: 'emerald', body: 'tall', eyes: 'open', accessory: 'beads' },
    { halo: 'sky', body: 'wide', eyes: 'wink', accessory: 'crescent' },
    { halo: 'violet', body: 'round', eyes: 'pensive', accessory: 'sparkles' },
    { halo: 'gold', body: 'tall', eyes: 'sleepy', accessory: 'book' },
    { halo: 'emerald', body: 'wide', eyes: 'smile', accessory: 'crescent' },
    { halo: 'sky', body: 'round', eyes: 'open', accessory: 'sparkles' },
    { halo: 'violet', body: 'tall', eyes: 'wink', accessory: 'beads' },
];

/**
 * The look at an index, whatever the index (it wraps around the list).
 */
export function lookAt(index: number): MascotLook {
    const count = MASCOT_LOOKS.length;

    return MASCOT_LOOKS[((index % count) + count) % count];
}

/**
 * The index of the look after the given one, back to the first after the last.
 */
export function nextLookIndex(index: number): number {
    return (index + 1) % MASCOT_LOOKS.length;
}
