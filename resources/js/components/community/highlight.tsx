import { Fragment } from 'react';
import { matchesAny } from '@/lib/community';

/**
 * The text with its words matching the search marked (diacritics and letter forms ignored).
 */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
    if (terms.length === 0) {
        return <>{text}</>;
    }

    return (
        <>
            {text.split(/(\s+)/).map((part, index) => (
                <Fragment key={index}>
                    {part.trim() !== '' && matchesAny(part, terms) ? (
                        <mark className="rounded-md bg-gold-200/70 px-0.5 text-inherit dark:bg-gold-500/30">{part}</mark>
                    ) : (
                        part
                    )}
                </Fragment>
            ))}
        </>
    );
}
