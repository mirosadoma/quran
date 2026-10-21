import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { BottomNav } from '@/components/layout/bottom-nav';
import { sampleUser, setPage, stubRoutes } from './support';

/**
 * The labels of the tabs, in their order.
 */
function tabs(html: string): string[] {
    return [...html.matchAll(/<span class="max-w-full truncate">([^<]+)<\/span>/g)].map((match) => match[1]);
}

beforeEach(() => {
    stubRoutes();
    setPage();
});

describe('the bottom bar of the phones', () => {
    it('shows the pages of the website to the visitors, with the sign-in and the new account', () => {
        const html = renderToStaticMarkup(<BottomNav onMore={() => undefined} />);

        assert.deepEqual(tabs(html), ['الرئيسية', 'الأكاديميات', 'الفيديوهات', 'حساب جديد', 'تسجيل الدخول']);
        assert.ok(html.includes('href="/site/academies"'));
        assert.ok(html.includes('data-bottom-nav'));
        assert.ok(html.includes('md:hidden'), 'phones only');
    });

    it('takes the signed-in users into their control panel, with "More" for the rest of the pages', () => {
        setPage({ user: sampleUser('teacher'), counts: { notifications: 0, chat: 4, join_requests: 0, contact_messages: 0 } });
        const html = renderToStaticMarkup(<BottomNav onMore={() => undefined} />);

        assert.deepEqual(tabs(html), ['لوحة التحكم', 'حلقاتي', 'الجلسات', 'المحادثات', 'المزيد']);
        assert.ok(html.includes('href="/dashboard"'));
        assert.ok(html.includes('>4</span>'), 'the unread messages on the chat tab');
    });

    it('gives every role its own tabs', () => {
        setPage({ user: sampleUser('admin') });
        assert.deepEqual(tabs(renderToStaticMarkup(<BottomNav onMore={() => undefined} />)), ['لوحة التحكم', 'الأكاديميات', 'المستخدمون', 'التقارير', 'المزيد']);

        setPage({ user: sampleUser('manager'), counts: { notifications: 0, chat: 0, join_requests: 2, contact_messages: 0 } });
        const manager = renderToStaticMarkup(<BottomNav onMore={() => undefined} />);
        assert.deepEqual(tabs(manager), ['لوحة التحكم', 'الحلقات', 'الجلسات', 'الطلبات', 'المزيد']);
        assert.ok(manager.includes('>2</span>'), 'the pending join requests');

        setPage({ user: sampleUser('student') });
        assert.deepEqual(tabs(renderToStaticMarkup(<BottomNav onMore={() => undefined} />)), ['لوحة التحكم', 'حلقاتي', 'المصحف', 'المحادثات', 'المزيد']);
    });

    it('gives a student without academy the pages they use alone, no halaqat nor chat', () => {
        setPage({ user: sampleUser('student', { academy: false }) });

        assert.deepEqual(tabs(renderToStaticMarkup(<BottomNav onMore={() => undefined} />)), ['لوحة التحكم', 'المصحف', 'أذكار', 'الفيديوهات', 'المزيد']);
    });

    it('marks the tab of the current page', () => {
        stubRoutes('halaqat.show');
        setPage({ user: sampleUser('teacher') });
        const html = renderToStaticMarkup(<BottomNav onMore={() => undefined} />);

        assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
        assert.ok(/href="\/halaqat\/index"[^>]*aria-current="page"/.test(html));
    });
});
