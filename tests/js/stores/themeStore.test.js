/**
 * Tests for themeStore
 */

import themeStore from '../../../src/difflicious/static/js/stores/themeStore.js';

describe('themeStore', () => {
    beforeEach(() => {
        // Reset store state
        themeStore.current = 'light';
        // Clear localStorage
        localStorage.clear();
        // Reset document theme
        document.documentElement.removeAttribute('data-theme');
        // Mock matchMedia
        window.matchMedia = jest.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        }));
    });

    describe('initialization', () => {
        it('should have correct initial state', () => {
            expect(themeStore.current).toBe('light');
        });

        it('should initialize dark from DOM data-theme attribute', () => {
            document.documentElement.setAttribute('data-theme', 'dark');

            themeStore.init();

            expect(themeStore.current).toBe('dark');
        });

        it('should initialize light when DOM data-theme is not dark', () => {
            // data-theme not set (or set to 'light') → light
            document.documentElement.removeAttribute('data-theme');

            themeStore.init();

            expect(themeStore.current).toBe('light');
        });

        it('should register system-preference change listener', () => {
            const addEventListenerMock = jest.fn();
            window.matchMedia = jest.fn().mockReturnValue({
                matches: false,
                media: '',
                addEventListener: addEventListenerMock,
                removeEventListener: jest.fn()
            });

            themeStore.init();

            expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
        });
    });

    describe('theme toggling', () => {
        it('should toggle from light to dark', () => {
            themeStore.current = 'light';

            themeStore.toggle();

            expect(themeStore.current).toBe('dark');
            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        });

        it('should toggle from dark to light', () => {
            themeStore.current = 'dark';

            themeStore.toggle();

            expect(themeStore.current).toBe('light');
            expect(document.documentElement.getAttribute('data-theme')).toBeNull();
        });

        it('should save theme to localStorage', () => {
            themeStore.current = 'light';

            themeStore.toggle();

            expect(localStorage.getItem('difflicious-theme')).toBe('dark');
        });

        it('should return false to prevent form submission', () => {
            expect(themeStore.toggle()).toBe(false);
        });
    });

    describe('applyTheme', () => {
        it('should apply dark theme to document', () => {
            themeStore.current = 'dark';

            themeStore.applyTheme();

            expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
        });

        it('should apply light theme to document', () => {
            themeStore.current = 'light';

            themeStore.applyTheme();

            expect(document.documentElement.getAttribute('data-theme')).toBeNull();
        });
    });

    describe('computed properties', () => {
        it('should return correct icon for light theme', () => {
            themeStore.current = 'light';
            expect(themeStore.icon).toBe('☀️');
        });

        it('should return correct icon for dark theme', () => {
            themeStore.current = 'dark';
            expect(themeStore.icon).toBe('🌙');
        });

        it('should return true for isDark when theme is dark', () => {
            themeStore.current = 'dark';
            expect(themeStore.isDark).toBe(true);
            expect(themeStore.isLight).toBe(false);
        });

        it('should return true for isLight when theme is light', () => {
            themeStore.current = 'light';
            expect(themeStore.isLight).toBe(true);
            expect(themeStore.isDark).toBe(false);
        });
    });
});
