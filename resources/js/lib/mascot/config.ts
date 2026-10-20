import type { QuoteKind } from '@/lib/mascot/quotes';

/**
 * Every delay of the companion (the lantern mascot), in milliseconds. Change the numbers here only.
 *
 * One cycle: the rope (the lantern comes down from the top of the page, welcomes, and is pulled back up) →
 * the chase (it runs after the pointer, eats it and falls into a pit) → the visits (a lantern in a corner or
 * on a side of the page, one after the other) → after the last visit and the same gap, the rope again.
 */
export const MASCOT_TIMING = {
    /** The rope: how long after a fresh start it comes down, how long it stays, and its moves. */
    introDelay: 400,
    introDuration: 5000,
    introEnter: 900,
    introExit: 700,
    /**
     * The pause between two scenes, from the moment one is gone to the moment the next appears, everywhere:
     * rope → chase, chase → first visit, visit → visit, last visit → rope (rope → first visit on touch screens).
     */
    gap: 60000,
    /** The visits: a lantern stays `visible`, then hides with the `exit` move. */
    visible: 8000,
    enter: 600,
    exit: 500,
    /** A page opened during a day's session shows its step after at least this short delay. */
    resumeDelay: 600,
    /** The cycle moves on to the visits if the chase never reports its end (its page was left mid-chase). */
    chaseTimeout: 30000,
    /** The small companions of the dashboard greeting and the page headers change their look this often. */
    dashboardLookEvery: 6000,
    headerLookEvery: 8000,
} as const;

/**
 * The chase, in milliseconds and pixels.
 */
export const CHASE_TIMING = {
    /** It pops up from a bottom corner `MASCOT_TIMING.gap` after the rope lantern is gone; the pop itself lasts this long. */
    enter: 400,
    /** How fast it runs after the pointer (pixels per second): slower than a quick hand, so one can flee. */
    speed: 430,
    /** It stops and eats the pointer when its mouth comes this close. */
    catchRadius: 30,
    /** It opens its jaws under this distance and closes them beyond it. */
    jawsDistance: 120,
    /** It gives up (falls into its pit) when the pointer has not moved for this long... */
    idleTimeout: 8000,
    /** ...or when the chase has lasted this long without a catch. */
    maxDuration: 20000,
    /** The meal: the fake pointer slides into the mouth (`swallow`), the jaws chomp twice from `chompAt`
     *  (`chompGap` apart) and the real pointer comes back after `eatDuration`. */
    eatDuration: 800,
    swallow: 400,
    chompAt: 400,
    chompGap: 140,
    /** The pit opens under its feet, it falls in, the pit closes. */
    pitOpen: 320,
    fall: 750,
    pitClose: 300,
    /** How it runs: the lean in the direction of the run (degrees), the hops (pixels) and their pace (per second). */
    tilt: 12,
    hop: 7,
    bounceHz: 4,
} as const;

/**
 * The day's session of the companion in the browser (localStorage): where the show stands, so a refresh or
 * a new page carries on from the same step instead of starting over.
 */
export const MASCOT_SESSION = {
    key: 'mascot:session',
    duration: 24 * 60 * 60 * 1000,
} as const;

/** Where a visiting lantern stands on the page (inline-start / inline-end follow the direction of the language). */
export type MascotPosition = 'bottom-end' | 'bottom-start' | 'middle-end' | 'middle-start';

export interface MascotVisit {
    /** The corner or side of the page. */
    position: MascotPosition;
    /** The index of the look in MASCOT_LOOKS (halo color, body, eyes, accessory). */
    look: number;
    /** What the bubble shows: an ayah, a hadith, a dhikr or a saying, taken in turn from the texts of the platform. */
    kind: QuoteKind;
}

/**
 * The visits of one cycle, in their order. The chase lantern pops up from the corner opposite to the first visit.
 */
export const MASCOT_VISITS: MascotVisit[] = [
    { position: 'bottom-end', look: 0, kind: 'ayah' },
    { position: 'bottom-start', look: 1, kind: 'hadith' },
    { position: 'middle-end', look: 2, kind: 'dhikr' },
    { position: 'middle-start', look: 3, kind: 'ayah' },
    { position: 'bottom-end', look: 4, kind: 'wisdom' },
    { position: 'bottom-start', look: 5, kind: 'hadith' },
    { position: 'middle-end', look: 6, kind: 'ayah' },
    { position: 'middle-start', look: 7, kind: 'dhikr' },
];

export type MascotVariant = 'app' | 'site' | 'auth';

/**
 * What changes between the control panels (app), the public website (site) and the sign-in pages (auth):
 * the welcome of the rope, and which kinds of texts the visits show.
 */
export const MASCOT_VARIANTS: Record<MascotVariant, { welcome: string; kinds: QuoteKind[] }> = {
    app: { welcome: 'Peace be upon you, welcome back to :name', kinds: ['ayah', 'hadith', 'dhikr', 'wisdom'] },
    site: { welcome: 'Peace be upon you, welcome to :name', kinds: ['ayah', 'hadith', 'wisdom'] },
    auth: { welcome: 'Peace be upon you, welcome to :name', kinds: ['ayah', 'dhikr'] },
};

/**
 * Longest bubble text; longer texts are cut at a word with a "read more" link to their page.
 */
export const MASCOT_TEXT_LIMIT = 150;
