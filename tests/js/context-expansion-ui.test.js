/**
 * Tests for context-expansion-ui module helpers
 */

import {
    createPlainContextHtml,
    injectPygmentsCss,
    insertExpandedContext,
    updateHunkLinesDataAttributes
} from '../../src/difflicious/static/js/modules/context-expansion-ui.js';

const buildHunkWithLines = (direction = 'before') => {
    document.body.innerHTML = `
        <div data-file="src/test.js">
            <div class="hunk">
                <div class="hunk-lines"
                    data-left-start-line="5"
                    data-left-end-line="10"
                    data-right-start-line="8"
                    data-right-end-line="13">
                    <div class="existing-line">Existing</div>
                </div>
                <button class="expansion-btn" data-direction="${direction}"></button>
            </div>
        </div>
    `;

    return document.querySelector('.expansion-btn');
};

describe('injectPygmentsCss', () => {
    it('adds styles once', () => {
        document.head.innerHTML = '';
        injectPygmentsCss('.test { color: red; }');
        injectPygmentsCss('.test { color: blue; }');

        expect(document.querySelectorAll('#pygments-styles').length).toBe(1);
    });
});

describe('createPlainContextHtml', () => {
    it('escapes content and includes line numbers', () => {
        const button = buildHunkWithLines('before');
        const html = createPlainContextHtml(
            { lines: ['<tag>'] },
            'exp-1',
            button,
            'before'
        );

        expect(html).toContain('&lt;tag&gt;');
        expect(html).toContain('>3<');
        expect(html).toContain('>8<');
    });
});

describe('insertExpandedContext', () => {
    it('inserts expanded context before existing lines', () => {
        const button = buildHunkWithLines('before');
        insertExpandedContext(
            button,
            'src/test.js',
            0,
            'before',
            '<div class="expanded-context">New</div>'
        );

        const hunkLines = document.querySelector('.hunk-lines');
        expect(hunkLines.firstElementChild.classList.contains('expanded-context')).toBe(true);
    });
});

describe('updateHunkLinesDataAttributes', () => {
    it('updates start lines when expanding before', () => {
        const button = buildHunkWithLines('before');
        updateHunkLinesDataAttributes(button, 'before', 2);

        const hunkLines = document.querySelector('.hunk-lines');
        expect(hunkLines.dataset.leftStartLine).toBe('3');
        expect(hunkLines.dataset.rightStartLine).toBe('6');
    });
});
