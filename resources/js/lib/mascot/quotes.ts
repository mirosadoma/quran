export type QuoteKind = 'ayah' | 'hadith' | 'dhikr' | 'wisdom';

/**
 * A text the companion shows, read from the tables of the platform (shared prop "mascot", App\Services\MascotQuotes).
 */
export interface MascotQuote {
    id: string;
    kind: QuoteKind;
    text: string;
    /** "سورة القمر: 17", "متفق عليه", "رواه مسلم"... */
    source: string;
    /** The page of the text in the platform (the mushaf, the hadith, the adhkar, the sayings). */
    href: string | null;
}

/**
 * The quotes of the wanted kinds, falling back to every quote when none of them exists.
 */
export function quotesOfKinds(quotes: MascotQuote[], kinds: QuoteKind[]): MascotQuote[] {
    const wanted = quotes.filter((quote) => kinds.includes(quote.kind));

    return wanted.length > 0 ? wanted : quotes;
}

/**
 * The quote shown by the visit number `index` of a kind: the kind's quotes are taken in turn, so two visits of the
 * same kind never show the same text in a row (unless the kind has one text).
 */
export function quoteForVisit(quotes: MascotQuote[], kind: QuoteKind, index: number): MascotQuote | null {
    const ofKind = quotesOfKinds(quotes, [kind]);

    if (ofKind.length === 0) {
        return null;
    }

    return ofKind[((index % ofKind.length) + ofKind.length) % ofKind.length];
}

/**
 * The quote of the day: the same for everyone during a day, another one tomorrow.
 */
export function quoteOfTheDay(quotes: MascotQuote[], date: Date = new Date()): MascotQuote | null {
    if (quotes.length === 0) {
        return null;
    }

    const start = Date.UTC(date.getFullYear(), 0, 0);
    const day = Math.floor((date.getTime() - start) / 86_400_000);

    return quotes[day % quotes.length];
}

/**
 * Cut a long text at a word, with an ellipsis; the whole text stays one click away ("read more").
 */
export function truncateQuote(text: string, limit: number): { text: string; truncated: boolean } {
    if (text.length <= limit) {
        return { text, truncated: false };
    }

    const cut = text.slice(0, limit);
    const lastSpace = cut.lastIndexOf(' ');

    return { text: `${(lastSpace > limit / 2 ? cut.slice(0, lastSpace) : cut).replace(/[،,.;:]$/, '')}…`, truncated: true };
}
