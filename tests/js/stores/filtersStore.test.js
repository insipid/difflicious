import filtersStore from '../../../src/difflicious/static/js/stores/filtersStore.js';

describe('filtersStore', () => {
    let originalReplaceState;

    beforeEach(() => {
        document.body.innerHTML = `
            <div data-group="unstaged" style="display:none"></div>
            <div data-group="untracked" style="display:none"></div>
        `;
        originalReplaceState = window.history.replaceState;
        window.history.replaceState = jest.fn();
    });

    afterEach(() => {
        window.history.replaceState = originalReplaceState;
    });

    test('init applies the server-rendered visibility', () => {
        filtersStore.init(true, false);

        expect(document.querySelector('[data-group="unstaged"]').style.display).toBe('');
        expect(document.querySelector('[data-group="untracked"]').style.display).toBe('none');
    });

    test('toggle updates state and the matching group', () => {
        filtersStore.init(true, false);

        filtersStore.toggle('untracked', true);

        expect(filtersStore.untracked).toBe(true);
        expect(document.querySelector('[data-group="untracked"]').style.display).toBe('');
    });

    test('toggle records the choice in the URL without reloading', () => {
        filtersStore.init(true, true);

        filtersStore.toggle('unstaged', false);

        expect(window.history.replaceState).toHaveBeenCalled();
        const url = window.history.replaceState.mock.calls.at(-1)[2];
        expect(new URL(url).searchParams.get('unstaged')).toBe('false');
    });

    test('tolerates a page with no groups rendered', () => {
        document.body.innerHTML = '';

        expect(() => filtersStore.init(true, true)).not.toThrow();
    });
});
