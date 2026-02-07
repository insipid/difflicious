/**
 * Tests for full-diff module helpers
 */

import {
    renderFullDiff,
    renderSideBySideLine
} from '../../src/difflicious/static/js/modules/full-diff.js';

describe('renderSideBySideLine', () => {
    it('renders context lines', () => {
        const html = renderSideBySideLine({
            type: 'context',
            left: { line_num: 1, content: 'alpha' },
            right: { line_num: 1, content: 'alpha' }
        });

        expect(html).toContain('alpha');
        expect(html).toContain('line-context');
    });

    it('renders addition lines with plus prefix', () => {
        const html = renderSideBySideLine({
            type: 'addition',
            right: { line_num: 2, content: 'bravo' }
        });

        expect(html).toContain('+');
        expect(html).toContain('bravo');
    });
});

describe('renderFullDiff', () => {
    it('renders parsed diff hunks into container', async() => {
        const container = document.createElement('div');
        const diffData = {
            file_path: 'src/test.js',
            diff_data: {
                hunks: [
                    {
                        lines: [
                            {
                                type: 'context',
                                left: { line_num: 1, content: 'alpha' },
                                right: { line_num: 1, content: 'alpha' }
                            }
                        ]
                    }
                ]
            }
        };

        await renderFullDiff(container, diffData, 'file-1');
        expect(container.innerHTML).toContain('hunk-lines');
    });
});
