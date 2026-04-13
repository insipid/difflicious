import { toolbarComponent } from '../../src/difflicious/static/js/modules/toolbar.js';

describe('toolbarComponent', () => {
    let comp;

    beforeEach(() => {
        document.body.innerHTML = `
            <div data-group="unstaged" style="display:none"></div>
            <div data-group="untracked" style="display:none"></div>
        `;
        comp = toolbarComponent(true, false); // unstaged=true, untracked=false
        comp.init();
    });

    test('init applies initial visibility', () => {
        const unstaged = document.querySelector('[data-group="unstaged"]');
        const untracked = document.querySelector('[data-group="untracked"]');
        expect(unstaged.style.display).toBe('');
        expect(untracked.style.display).toBe('none');
    });

    test('updateToggle changes state and updates DOM', () => {
        comp.updateToggle('untracked', true);
        expect(comp.untracked).toBe(true);
        const el = document.querySelector('[data-group="untracked"]');
        expect(el.style.display).toBe('');
    });

    test('scrubEmptySearch clears field name when blank', () => {
        document.body.innerHTML += '<form><input name="search" value="   "></form>';
        const form = document.querySelector('form');
        comp.scrubEmptySearch(form);
        expect(form.querySelector('[name="search"]')).toBeNull();
    });

    test('scrubEmptySearch leaves field name when value present', () => {
        document.body.innerHTML += '<form><input name="search" value="foo"></form>';
        const form = document.querySelector('form');
        comp.scrubEmptySearch(form);
        expect(form.querySelector('[name="search"]')).not.toBeNull();
    });
});
