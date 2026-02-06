/**
 * Tests for context-expansion module helpers
 */

import { updateHunkRangeAfterExpansion } from '../../src/difflicious/static/js/modules/context-expansion.js';

const buildHunk = (direction) => {
    document.body.innerHTML = `
        <div data-file="src/test.js">
            <div class="hunk"
                data-line-start="10"
                data-line-end="20"
                data-left-line-start="5"
                data-left-line-end="15">
                <button class="expansion-btn" data-direction="${direction}"></button>
            </div>
        </div>
    `;

    return document.querySelector('.expansion-btn');
};

describe('updateHunkRangeAfterExpansion', () => {
    it('updates ranges for after expansion', () => {
        const button = buildHunk('after');
        updateHunkRangeAfterExpansion(button, 21, 25);

        const hunk = button.closest('.hunk');
        expect(hunk.dataset.lineStart).toBe('10');
        expect(hunk.dataset.lineEnd).toBe('25');
        expect(hunk.dataset.leftLineStart).toBe('16');
        expect(hunk.dataset.leftLineEnd).toBe('20');
    });

    it('updates ranges for before expansion', () => {
        const button = buildHunk('before');
        updateHunkRangeAfterExpansion(button, 1, 4);

        const hunk = button.closest('.hunk');
        expect(hunk.dataset.lineStart).toBe('1');
        expect(hunk.dataset.lineEnd).toBe('20');
        expect(hunk.dataset.leftLineStart).toBe('1');
        expect(hunk.dataset.leftLineEnd).toBe('4');
    });
});
