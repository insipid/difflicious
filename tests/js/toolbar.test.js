import { toolbarComponent } from '../../src/difflicious/static/js/modules/toolbar.js';

describe('toolbarComponent', () => {
    let comp;

    beforeEach(() => {
        document.body.innerHTML = '';
        comp = toolbarComponent();
    });

    test('scrubEmptySearch clears field name when blank', () => {
        document.body.innerHTML = '<form><input name="search" value="   "></form>';
        const form = document.querySelector('form');
        comp.scrubEmptySearch(form);
        expect(form.querySelector('[name="search"]')).toBeNull();
    });

    test('scrubEmptySearch leaves field name when value present', () => {
        document.body.innerHTML = '<form><input name="search" value="foo"></form>';
        const form = document.querySelector('form');
        comp.scrubEmptySearch(form);
        expect(form.querySelector('[name="search"]')).not.toBeNull();
    });

    test('scrubEmptySearch tolerates a form without a search field', () => {
        document.body.innerHTML = '<form></form>';
        const form = document.querySelector('form');
        expect(() => comp.scrubEmptySearch(form)).not.toThrow();
    });
});
