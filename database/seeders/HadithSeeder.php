<?php

namespace Database\Seeders;

use App\Models\Hadith;
use App\Models\HadithBook;
use App\Models\HadithCollection;
use App\Services\Mushaf;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

/**
 * The books of hadith: the six books, Muwatta Malik, Riyad as-Salihin, Al-Adab Al-Mufrad, Bulugh Al-Maram,
 * Ash-Shama'il, the Forty of An-Nawawi and forty hadith qudsi, with the grade of Al-Albani (or of the editor
 * of the book) for every hadith outside the two Sahihs.
 *
 * Data: database/data/hadith/{slug}.json, one file per collection holding its books (kutub) and hadiths
 * with the text and numbering of sunnah.com (through the open datasets fawazahmed0/hadith-api and
 * AhmedBaset/hadith-json). Running it again refreshes the hadiths (matched by collection, number and part);
 * a collection whose file is missing is skipped.
 */
class HadithSeeder extends Seeder
{
    /**
     * @param  string|null  $path  Folder of the collection files (database/data/hadith by default).
     */
    public function __construct(protected ?string $path = null) {}

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $order = 0;

        foreach ($this->collections() as $slug => $attributes) {
            $order++;
            $file = ($this->path ?? database_path('data/hadith'))."/{$slug}.json";

            if (! File::exists($file)) {
                continue;
            }

            $data = json_decode(File::get($file), true, flags: JSON_THROW_ON_ERROR);
            $collection = HadithCollection::query()->updateOrCreate(['slug' => $slug], [...$attributes, 'sort_order' => $order]);

            HadithBook::query()->upsert(
                array_map(fn (array $book): array => [
                    'hadith_collection_id' => $collection->id,
                    'number' => (int) $book['number'],
                    'name' => (string) ($book['name'] ?? $book['name_en']),
                    'name_en' => $book['name_en'] ?? null,
                ], $data['books']),
                ['hadith_collection_id', 'number'],
                ['name', 'name_en'],
            );

            $bookIds = $collection->books()->pluck('id', 'number');

            foreach (array_chunk($data['hadiths'], 250) as $chunk) {
                Hadith::query()->upsert(
                    array_map(fn (array $hadith): array => [
                        'hadith_collection_id' => $collection->id,
                        'hadith_book_id' => isset($hadith['book']) ? $bookIds->get((int) $hadith['book']) : null,
                        'number' => (int) $hadith['number'],
                        'part' => (int) ($hadith['part'] ?? 1),
                        'text' => (string) $hadith['text'],
                        'text_search' => Mushaf::normalize((string) $hadith['text']),
                        'grade' => $hadith['grade'] ?? null,
                        'grader' => $hadith['grader'] ?? null,
                    ], $chunk),
                    ['hadith_collection_id', 'number', 'part'],
                    ['hadith_book_id', 'text', 'text_search', 'grade', 'grader'],
                );
            }

            unset($data);
        }
    }

    /**
     * The collections in the order of the hadith page, keyed by their slug (the name of their file).
     *
     * @return array<string, array{name: string, name_en: string, author: string, author_en: string, description: string, description_en: string, icon: string, color: string}>
     */
    protected function collections(): array
    {
        return [
            'bukhari' => [
                'name' => 'صحيح البخاري',
                'name_en' => 'Sahih al-Bukhari',
                'author' => 'الإمام محمد بن إسماعيل البخاري (ت 256هـ)',
                'author_en' => 'Imam Muhammad ibn Ismail al-Bukhari (d. 256 AH)',
                'description' => 'أصح الكتب بعد كتاب الله؛ جمع فيه الإمام البخاري ما صح عنده من حديث النبي ﷺ مرتبًا على الأبواب.',
                'description_en' => 'The most authentic book after the Book of Allah: the hadiths of the Prophet ﷺ that Imam al-Bukhari verified, arranged by topic.',
                'icon' => 'book-marked',
                'color' => 'emerald',
            ],
            'muslim' => [
                'name' => 'صحيح مسلم',
                'name_en' => 'Sahih Muslim',
                'author' => 'الإمام مسلم بن الحجاج النيسابوري (ت 261هـ)',
                'author_en' => 'Imam Muslim ibn al-Hajjaj an-Naysaburi (d. 261 AH)',
                'description' => 'ثاني الصحيحين؛ امتاز بجمع طرق الحديث في موضع واحد وحسن ترتيبه.',
                'description_en' => 'The second of the two Sahihs, known for gathering the chains of every hadith in one place and for its fine arrangement.',
                'icon' => 'book-open',
                'color' => 'teal',
            ],
            'abu-dawud' => [
                'name' => 'سنن أبي داود',
                'name_en' => 'Sunan Abi Dawud',
                'author' => 'الإمام أبو داود سليمان بن الأشعث السجستاني (ت 275هـ)',
                'author_en' => 'Imam Abu Dawud Sulayman ibn al-Ash\'ath as-Sijistani (d. 275 AH)',
                'description' => 'جمع فيه أحاديث الأحكام، فهو عمدة الفقهاء في معرفة أدلة المسائل، مع حكم الشيخ الألباني على كل حديث.',
                'description_en' => 'The hadiths of the rulings, the reference of the jurists for the proofs of their questions, with the grade of Al-Albani on every hadith.',
                'icon' => 'scale',
                'color' => 'gold',
            ],
            'tirmidhi' => [
                'name' => 'جامع الترمذي',
                'name_en' => 'Jami at-Tirmidhi',
                'author' => 'الإمام أبو عيسى محمد بن عيسى الترمذي (ت 279هـ)',
                'author_en' => 'Imam Abu Isa Muhammad ibn Isa at-Tirmidhi (d. 279 AH)',
                'description' => 'يذكر الحديث ثم يبين درجته ومذاهب الفقهاء فيه، فجمع بين الرواية والدراية.',
                'description_en' => 'States each hadith, then its grade and the views of the jurists on it, joining narration and understanding.',
                'icon' => 'scroll-text',
                'color' => 'sky',
            ],
            'nasai' => [
                'name' => 'سنن النسائي',
                'name_en' => 'Sunan an-Nasa\'i',
                'author' => 'الإمام أحمد بن شعيب النسائي (ت 303هـ)',
                'author_en' => 'Imam Ahmad ibn Shu\'ayb an-Nasa\'i (d. 303 AH)',
                'description' => 'السنن الصغرى (المجتبى)؛ من أدق كتب السنن في انتقاء الرجال وبيان علل الأحاديث.',
                'description_en' => 'The Sunan as-Sughra (Al-Mujtaba), among the most careful of the Sunan in choosing narrators and showing the defects of hadiths.',
                'icon' => 'feather',
                'color' => 'indigo',
            ],
            'ibn-majah' => [
                'name' => 'سنن ابن ماجه',
                'name_en' => 'Sunan Ibn Majah',
                'author' => 'الإمام محمد بن يزيد ابن ماجه القزويني (ت 273هـ)',
                'author_en' => 'Imam Muhammad ibn Yazid Ibn Majah al-Qazwini (d. 273 AH)',
                'description' => 'سادس الكتب الستة، حسن الترتيب، تفرد بأحاديث ليست في بقية الكتب.',
                'description_en' => 'The sixth of the six books, finely arranged, with hadiths found in none of the others.',
                'icon' => 'library',
                'color' => 'violet',
            ],
            'malik' => [
                'name' => 'موطأ الإمام مالك',
                'name_en' => 'Muwatta Malik',
                'author' => 'الإمام مالك بن أنس (ت 179هـ)',
                'author_en' => 'Imam Malik ibn Anas (d. 179 AH)',
                'description' => 'أقدم كتب الحديث المصنفة؛ جمع فيه إمام دار الهجرة الحديث وفقه أهل المدينة.',
                'description_en' => 'The oldest compiled book of hadith: the hadith and the practice of the people of Madinah, by the imam of the city of the Prophet ﷺ.',
                'icon' => 'landmark',
                'color' => 'amber',
            ],
            'riyad-as-salihin' => [
                'name' => 'رياض الصالحين',
                'name_en' => 'Riyad as-Salihin',
                'author' => 'الإمام يحيى بن شرف النووي (ت 676هـ)',
                'author_en' => 'Imam Yahya ibn Sharaf an-Nawawi (d. 676 AH)',
                'description' => 'أحاديث في الآداب والأخلاق والترغيب والترهيب، اختارها الإمام النووي من الصحاح.',
                'description_en' => 'Hadiths of manners, character, encouragement and warning, chosen by Imam an-Nawawi from the authentic books.',
                'icon' => 'heart',
                'color' => 'rose',
            ],
            'adab-al-mufrad' => [
                'name' => 'الأدب المفرد',
                'name_en' => 'Al-Adab Al-Mufrad',
                'author' => 'الإمام محمد بن إسماعيل البخاري (ت 256هـ)',
                'author_en' => 'Imam Muhammad ibn Ismail al-Bukhari (d. 256 AH)',
                'description' => 'كتاب الإمام البخاري في الأدب: بر الوالدين وصلة الرحم وحسن الخلق ومعاملة الناس.',
                'description_en' => 'Imam al-Bukhari\'s book of manners: kindness to parents, ties of kinship, good character and dealing with people.',
                'icon' => 'sparkles',
                'color' => 'emerald',
            ],
            'bulugh-al-maram' => [
                'name' => 'بلوغ المرام من أدلة الأحكام',
                'name_en' => 'Bulugh al-Maram',
                'author' => 'الحافظ ابن حجر العسقلاني (ت 852هـ)',
                'author_en' => 'Al-Hafiz Ibn Hajar al-Asqalani (d. 852 AH)',
                'description' => 'أحاديث الأحكام الفقهية على ترتيب أبواب الفقه، مع بيان من أخرج كل حديث.',
                'description_en' => 'The hadiths of the rulings of fiqh in the order of its chapters, with who narrated each one.',
                'icon' => 'gem',
                'color' => 'gold',
            ],
            'shamail' => [
                'name' => 'الشمائل المحمدية',
                'name_en' => 'Ash-Shama\'il al-Muhammadiyyah',
                'author' => 'الإمام أبو عيسى محمد بن عيسى الترمذي (ت 279هـ)',
                'author_en' => 'Imam Abu Isa Muhammad ibn Isa at-Tirmidhi (d. 279 AH)',
                'description' => 'صفة النبي ﷺ في خَلقه وخُلقه ولباسه وعيشه، حتى كأنك تراه.',
                'description_en' => 'The description of the Prophet ﷺ: his features, his character, his dress and his way of living, as if you saw him.',
                'icon' => 'moon-star',
                'color' => 'teal',
            ],
            'nawawi-40' => [
                'name' => 'الأربعون النووية',
                'name_en' => 'The Forty Hadith of an-Nawawi',
                'author' => 'الإمام يحيى بن شرف النووي (ت 676هـ)',
                'author_en' => 'Imam Yahya ibn Sharaf an-Nawawi (d. 676 AH)',
                'description' => 'اثنان وأربعون حديثًا جامعة لقواعد الدين، وهي أول ما يحفظه طلاب العلم.',
                'description_en' => 'Forty-two hadiths holding the principles of the religion, the first ones students of knowledge memorize.',
                'icon' => 'star',
                'color' => 'sky',
            ],
            'qudsi-40' => [
                'name' => 'الأربعون القدسية',
                'name_en' => 'Forty Hadith Qudsi',
                'author' => 'منتقاة من كتب السنة',
                'author_en' => 'Chosen from the books of the sunnah',
                'description' => 'أحاديث يرويها النبي ﷺ عن ربه عز وجل، منتقاة من الصحاح والسنن.',
                'description_en' => 'Hadiths the Prophet ﷺ relates from his Lord, chosen from the Sahihs and the Sunan.',
                'icon' => 'sun',
                'color' => 'violet',
            ],
        ];
    }
}
