export interface Verse {
    text: string;
    reference: { ar: string; en: string };
    translation: string;
}

/**
 * Verses about the Quran shown as "ayah of the day".
 */
export const verses: Verse[] = [
    {
        text: 'إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ',
        reference: { ar: 'الإسراء: ٩', en: 'Al-Isra 17:9' },
        translation: 'Indeed, this Quran guides to that which is most upright.',
    },
    {
        text: 'وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ',
        reference: { ar: 'القمر: ١٧', en: 'Al-Qamar 54:17' },
        translation: 'And We have certainly made the Quran easy for remembrance, so is there any who will remember?',
    },
    {
        text: 'إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ',
        reference: { ar: 'الحجر: ٩', en: 'Al-Hijr 15:9' },
        translation: 'Indeed, it is We who sent down the message, and indeed, We will be its guardian.',
    },
    {
        text: 'كِتَابٌ أَنزَلْنَاهُ إِلَيْكَ مُبَارَكٌ لِّيَدَّبَّرُوا آيَاتِهِ',
        reference: { ar: 'ص: ٢٩', en: 'Sad 38:29' },
        translation: 'A blessed Book which We have revealed to you, that they might reflect upon its verses.',
    },
    {
        text: 'وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا',
        reference: { ar: 'المزمل: ٤', en: 'Al-Muzzammil 73:4' },
        translation: 'And recite the Quran with measured recitation.',
    },
    {
        text: 'بَلْ هُوَ آيَاتٌ بَيِّنَاتٌ فِي صُدُورِ الَّذِينَ أُوتُوا الْعِلْمَ',
        reference: { ar: 'العنكبوت: ٤٩', en: 'Al-Ankabut 29:49' },
        translation: 'Rather, it is distinct verses preserved within the breasts of those who have been given knowledge.',
    },
    {
        text: 'فَاقْرَءُوا مَا تَيَسَّرَ مِنَ الْقُرْآنِ',
        reference: { ar: 'المزمل: ٢٠', en: 'Al-Muzzammil 73:20' },
        translation: 'So recite what is easy from the Quran.',
    },
];

export function verseOfTheDay(date: Date = new Date()): Verse {
    const start = Date.UTC(date.getFullYear(), 0, 0);
    const day = Math.floor((date.getTime() - start) / 86_400_000);

    return verses[day % verses.length];
}
