import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { WelcomeBanner } from '@/components/dashboard/widgets';
import { PageHeader } from '@/components/layout/page-header';
import { LoadingScreen } from '@/components/layout/loading-screen';
import { Buddy, HeaderBuddy } from '@/components/mascot/buddy';
import { ChaseMascot } from '@/components/mascot/chase-mascot';
import { LoaderBuddy } from '@/components/mascot/loader-buddy';
import { MascotFace } from '@/components/mascot/mascot-face';
import { QuoteBubble } from '@/components/mascot/speech-bubble';
import { TourMascot } from '@/components/mascot/tour-mascot';
import { companionShownOn } from '@/hooks/use-companion';
import { MASCOT_TIMING } from '@/lib/mascot/config';
import { configureCycle, ensureCycleStarted, finishChase, resetCycle } from '@/lib/mascot/cycle';
import { MASCOT_LOOKS } from '@/lib/mascot/looks';
import { sampleQuotes, setPage, stubRoutes } from './support';

/**
 * Whether an element of the markup carries the class (a CSS variable of the same name does not count).
 */
function hasClass(html: string, name: string): boolean {
    return new RegExp(`class="(?:[^"]*\\s)?${name}(?:\\s[^"]*)?"`).test(html);
}

/**
 * A pretend window with the system's "less motion" wish, for the components that render on the server here.
 */
function pretendWindow(reducedMotion: boolean): void {
    (globalThis as { window?: unknown }).window = {
        matchMedia: (query: string) => ({ matches: reducedMotion && query.includes('prefers-reduced-motion'), addEventListener() {}, removeEventListener() {} }),
        sessionStorage: { getItem: () => null, setItem() {} },
    };
}

beforeEach(() => {
    stubRoutes();
    setPage();
    pretendWindow(false);
});

describe('the face', () => {
    it('is drawn in SVG with a halo of the look, no image', () => {
        const html = renderToStaticMarkup(<MascotFace look={MASCOT_LOOKS[2]} arms="point" size="2.5rem" />);

        assert.ok(html.startsWith('<svg'));
        assert.ok(html.includes('data-halo="sky"'));
        assert.ok(html.includes('mascot-arm-point'));
        assert.ok(!html.includes('<img'));
        assert.ok(html.includes('height:2.5rem'));
    });

    it('puts the busy hand on the other side for right-to-left pages', () => {
        const ltr = renderToStaticMarkup(<MascotFace look={MASCOT_LOOKS[0]} arms="point" />);
        const rtl = renderToStaticMarkup(<MascotFace look={MASCOT_LOOKS[0]} arms="point" mirrorArms />);

        assert.ok(!ltr.includes('scale(-1 1)'));
        assert.ok(rtl.includes('translate(100 0) scale(-1 1)'));
    });

    it('weeps and waves goodbye when sad, ponders with a hand under the chin when thinking', () => {
        const sad = renderToStaticMarkup(<MascotFace look={MASCOT_LOOKS[0]} mood="sad" arms="farewell" />);
        const thinking = renderToStaticMarkup(<LoaderBuddy />);

        assert.ok(sad.includes('mascot-tear'));
        assert.ok(sad.includes('mascot-arm-farewell'));
        assert.ok(thinking.includes('data-mood="thinking"'));
        assert.equal((thinking.match(/<i><\/i>/g) ?? []).length, 3, 'three moving dots in the thought cloud');
    });

    it('grins with a row of small teeth, and opens its jaws with pointed teeth and a tongue', () => {
        const grin = renderToStaticMarkup(<MascotFace look={MASCOT_LOOKS[0]} mood="grin" />);
        const jaws = renderToStaticMarkup(<MascotFace look={MASCOT_LOOKS[0]} mood="jaws" />);

        assert.ok(grin.includes('data-mouth="grin"'));
        assert.ok(/<rect[^>]*fill="#fff"[^>]*clip-path="url\(#mascot-[^)]+\)"/.test(grin), 'a white band of teeth clipped by the smile');
        assert.ok(grin.includes('var(--mascot-mouth)'), 'the inside of the mouth takes the theme color');
        assert.ok(jaws.includes('data-mouth="jaws"'));
        assert.ok(/<ellipse[^>]*fill="var\(--mascot-cheek\)"/.test(jaws), 'a tongue');
        assert.ok((jaws.match(/ Z/g) ?? []).length >= 7, 'triangular teeth above and below');
        assert.ok(!grin.includes('data-mouth="jaws"') && !jaws.includes('data-mouth="grin"'));
    });
});

describe('the chase', () => {
    afterEach(() => {
        resetCycle();
        mock.timers.reset();
    });

    it('starts hidden in its own layer that takes no clicks, with its pit and the pointer it will eat', () => {
        const html = renderToStaticMarkup(<ChaseMascot onDone={() => undefined} />);

        assert.ok(hasClass(html, 'mascot-chase'));
        assert.ok(html.includes('data-phase="hidden"'));
        assert.ok(html.includes('data-mouth="grin"'));
        assert.ok(hasClass(html, 'mascot-pit'));
        assert.ok(hasClass(html, 'mascot-fake-cursor'));
        assert.ok(hasClass(html, 'mascot-chase-shadow'));
        assert.ok(html.includes('--chase-width'));
    });

    it('is shown by the page between the rope and the visits', () => {
        mock.timers.enable({ apis: ['setTimeout', 'Date'] });
        configureCycle({ storage: null, canChase: () => true, timing: MASCOT_TIMING, visitsCount: 2 });
        ensureCycleStarted();

        const tick = (ms: number) => {
            for (let elapsed = 0; elapsed < ms; elapsed += 50) {
                mock.timers.tick(Math.min(50, ms - elapsed));
            }
        };

        tick(MASCOT_TIMING.introDelay);
        assert.ok(hasClass(renderToStaticMarkup(<TourMascot variant="site" />), 'mascot-intro'), 'the rope first');

        tick(MASCOT_TIMING.introDuration + MASCOT_TIMING.introExit + MASCOT_TIMING.gap);
        const chase = renderToStaticMarkup(<TourMascot variant="site" />);
        assert.ok(chase.includes('data-mascot-phase="chase"'));
        assert.ok(hasClass(chase, 'mascot-chase'), 'then the chase');
        assert.ok(!hasClass(chase, 'mascot-intro') && !hasClass(chase, 'mascot-visit'));

        finishChase();
        tick(MASCOT_TIMING.gap);
        const visit = renderToStaticMarkup(<TourMascot variant="site" />);
        assert.ok(hasClass(visit, 'mascot-visit'), 'then the visits');
        assert.ok(!hasClass(visit, 'mascot-chase'));
    });
});

describe('the page header', () => {
    it('shows the companion first, before the title it points at', () => {
        const html = renderToStaticMarkup(<PageHeader title="الحلقات" description="كل الحلقات" />);
        const mascot = html.indexOf('data-mascot-buddy="point"');
        const title = html.indexOf('الحلقات');

        assert.ok(mascot >= 0, 'the companion is in the header');
        assert.ok(title >= 0);
        assert.ok(mascot < title, 'the companion comes before the title');
        assert.ok(html.includes('height:2.5rem'));
    });

    it('turns the pointing hand to the title on Arabic pages and leaves it on English pages', () => {
        setPage({ locale: 'ar' });
        assert.ok(renderToStaticMarkup(<HeaderBuddy />).includes('scale(-1 1)'));

        setPage({ locale: 'en' });
        assert.ok(!renderToStaticMarkup(<HeaderBuddy />).includes('scale(-1 1)'));
    });
});

describe('the dashboard greeting', () => {
    it('shows the companion first, then the greeting beside it, and the text of the day in its bubble', () => {
        const html = renderToStaticMarkup(<WelcomeBanner title="السلام عليكم، أحمد" subtitle="جعل الله القرآن ربيع قلبك." />);
        const mascot = html.indexOf('data-mascot-buddy="wave"');
        const greeting = html.indexOf('السلام عليكم، أحمد');

        assert.ok(mascot >= 0 && greeting >= 0 && mascot < greeting);
        assert.ok(html.includes('height:4.5rem'));
        assert.ok(html.includes('data-tone="dark"'), 'the bubble lies on the dark banner');
        assert.ok(/اليوم/.test(html), 'the bubble is the text of the day');
    });
});

describe('the bubble', () => {
    it('writes the Quran in the mushaf script with its source, and cuts a long text with a link to read more', () => {
        const [ayah, , hadith] = sampleQuotes();
        const short = renderToStaticMarkup(<QuoteBubble quote={ayah} />);
        const long = renderToStaticMarkup(<QuoteBubble quote={{ ...hadith, text: 'كلمة '.repeat(60).trim() }} />);

        assert.ok(short.includes('font-mushaf'));
        assert.ok(short.includes('سورة الشرح: 6'));
        assert.ok(!short.includes('اقرأ المزيد'));
        assert.ok(long.includes('…'));
        assert.ok(long.includes('href="/admin/hadith/bukhari/6116"'));
        assert.ok(long.includes('اقرأ المزيد'));
    });
});

describe('the tour on the page', () => {
    it('renders only its layer before the first lantern comes', () => {
        const html = renderToStaticMarkup(<TourMascot variant="app" />);

        assert.ok(hasClass(html, 'mascot-layer'));
        assert.ok(html.includes('data-mascot-phase="idle"'));
        assert.ok(!hasClass(html, 'mascot-visit'));
    });

    it('stands still with the text of the day when the visitor asked for less motion', () => {
        pretendWindow(true);
        const html = renderToStaticMarkup(<TourMascot variant="site" />);

        assert.ok(hasClass(html, 'mascot-visit'), 'one lantern, at once');
        assert.ok(!hasClass(html, 'mascot-animated'), 'no movement');
        assert.ok(!html.includes('data-state='), 'no entering animation');
        assert.ok(!hasClass(html, 'mascot-intro'), 'no intro');
        assert.ok(hasClass(html, 'mascot-bubble'));
    });

    it('keeps the small companions still too', () => {
        pretendWindow(true);
        const html = renderToStaticMarkup(<Buddy size="2.5rem" arms="point" lookEvery={8000} />);

        assert.ok(!hasClass(html, 'mascot-animated'));
        assert.ok(!hasClass(html, 'mascot-float'));
    });
});

describe('where the administration hides it', () => {
    it('leaves the website and the sign-in pages without the tour, and keeps it in the panels', () => {
        setPage({ companion: { site: false, panel: true } });

        assert.equal(renderToStaticMarkup(<TourMascot variant="site" />), '');
        assert.equal(renderToStaticMarkup(<TourMascot variant="auth" />), '');
        assert.ok(hasClass(renderToStaticMarkup(<TourMascot variant="app" />), 'mascot-layer'));
    });

    it('leaves the panel of the role without the tour, the companions of the headers and the greeting, and its bubble', () => {
        setPage({ companion: { site: true, panel: false } });
        const header = renderToStaticMarkup(<PageHeader title="الحلقات" />);
        const greeting = renderToStaticMarkup(<WelcomeBanner title="السلام عليكم، أحمد" />);

        assert.equal(renderToStaticMarkup(<TourMascot variant="app" />), '');
        assert.ok(hasClass(renderToStaticMarkup(<TourMascot variant="site" />), 'mascot-layer'));
        assert.ok(!header.includes('data-mascot-buddy') && header.includes('الحلقات'));
        assert.ok(!greeting.includes('data-mascot-buddy') && greeting.includes('السلام عليكم، أحمد'));
        assert.ok(!greeting.includes('data-tone="dark"'), 'no bubble of the day without its companion');
    });

    it('tells the loading screen from the page being left', () => {
        const companion = { site: false, panel: true };

        assert.equal(companionShownOn({ component: 'site/home', props: { companion } }), false);
        assert.equal(companionShownOn({ component: 'auth/login', props: { companion } }), false);
        assert.equal(companionShownOn({ component: 'dashboard/student', props: { companion } }), true);
        assert.equal(companionShownOn({ component: 'site/home', props: {} }), true, 'shown when nothing says otherwise');

        const html = renderToStaticMarkup(<LoadingScreen name="وِرد" label="جارٍ التحميل…" companion={false} />);

        assert.ok(!html.includes('data-mascot-loader'));
        assert.ok(html.includes('<svg viewBox="0 0 48 48"'), 'the logo stays');
    });
});

describe('the loading screen', () => {
    it('puts the pondering companion right above the logo, in a full and a compact size', () => {
        const full = renderToStaticMarkup(<LoadingScreen name="وِرد" label="جارٍ التحميل…" />);
        const compact = renderToStaticMarkup(<LoadingScreen name="وِرد" label="جارٍ التحميل…" compact />);

        for (const html of [full, compact]) {
            const mascot = html.indexOf('data-mascot-loader');
            const logo = html.indexOf('<svg viewBox="0 0 48 48"');

            assert.ok(mascot >= 0 && logo >= 0 && mascot < logo, 'the companion comes before (above) the logo');
            assert.ok(html.includes('جارٍ التحميل…'));
        }

        assert.ok(full.includes('data-loading-screen="full"'));
        assert.ok(compact.includes('data-loading-screen="compact"'));
    });
});
