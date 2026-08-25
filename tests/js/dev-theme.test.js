import { installThemeConsole } from '../../src/difflicious/static/js/modules/dev-theme.js';

describe('installThemeConsole', () => {
    let target;
    let reload;

    const install = (overrides = {}) => installThemeConsole({
        themes: ['ledger', 'riso', 'console'],
        cookieName: 'difflicious_theme',
        target,
        reload,
        ...overrides
    });

    beforeEach(() => {
        target = {};
        reload = jest.fn();
        // Clear anything a previous test wrote; jsdom keeps cookies per document.
        document.cookie = 'difflicious_theme=; path=/; max-age=0';
    });

    test('hangs a method off the global for every theme', () => {
        install();
        expect(Object.keys(target.Difflicious.theme)).toEqual(
            ['ledger', 'riso', 'console', 'clear']
        );
    });

    test('a theme method sets the cookie to that theme', () => {
        install();
        target.Difflicious.theme.riso();
        expect(document.cookie).toContain('difflicious_theme=riso');
    });

    test('a theme method reloads the page', () => {
        install();
        target.Difflicious.theme.riso();
        expect(reload).toHaveBeenCalledTimes(1);
    });

    test('clear removes the cookie', () => {
        install();
        target.Difflicious.theme.riso();
        target.Difflicious.theme.clear();
        expect(document.cookie).not.toContain('difflicious_theme=riso');
    });

    test('keeps anything already on the global', () => {
        target.Difflicious = { existing: 'kept' };
        install();
        expect(target.Difflicious.existing).toBe('kept');
        expect(target.Difflicious.theme).toBeDefined();
    });

    test('installs nothing when the page named no themes', () => {
        expect(install({ themes: [] })).toBeNull();
        expect(target.Difflicious).toBeUndefined();
    });

    test('installs nothing without a cookie name', () => {
        expect(install({ cookieName: '' })).toBeNull();
        expect(target.Difflicious).toBeUndefined();
    });
});
