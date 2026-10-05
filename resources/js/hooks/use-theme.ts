import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

function storedTheme(): Theme {
    try {
        const value = localStorage.getItem('theme');

        return value === 'light' || value === 'dark' ? value : 'system';
    } catch {
        return 'system';
    }
}

function apply(theme: Theme): void {
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);

    // Keep the browser / installed app bar the same color as the page background.
    const canvas = getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim();

    if (canvas) {
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', canvas);
    }
}

/**
 * Light / dark / system theme remembered in this browser.
 */
export function useTheme(): { theme: Theme; isDark: boolean; setTheme: (theme: Theme) => void; toggle: () => void } {
    const [theme, setThemeState] = useState<Theme>(storedTheme);
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const listener = () => {
            if (storedTheme() === 'system') {
                apply('system');
                setIsDark(document.documentElement.classList.contains('dark'));
            }
        };

        const sync = () => {
            setThemeState(storedTheme());
            setIsDark(document.documentElement.classList.contains('dark'));
        };

        media.addEventListener('change', listener);
        window.addEventListener('theme-change', sync);

        return () => {
            media.removeEventListener('change', listener);
            window.removeEventListener('theme-change', sync);
        };
    }, []);

    const setTheme = useCallback((value: Theme) => {
        try {
            if (value === 'system') {
                localStorage.removeItem('theme');
            } else {
                localStorage.setItem('theme', value);
            }
        } catch {
            // Storage can be unavailable (private mode); the theme still applies for this visit.
        }

        apply(value);
        setThemeState(value);
        setIsDark(document.documentElement.classList.contains('dark'));
        window.dispatchEvent(new Event('theme-change'));
    }, []);

    const toggle = useCallback(() => {
        setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark');
    }, [setTheme]);

    return { theme, isDark, setTheme, toggle };
}
