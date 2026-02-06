/**
 * Tests for hunkComponent
 */

import { hunkComponent } from '../../../src/difflicious/static/js/components/hunkComponent.js';

describe('hunkComponent', () => {
    beforeEach(() => {
        window.expandContext = jest.fn().mockResolvedValue();
    });

    it('tracks loading state', () => {
        const component = hunkComponent('src/test.js', 0);
        expect(component.isLoading('before')).toBe(false);
        component.loading.before = true;
        expect(component.isLoading('before')).toBe(true);
    });

    it('returns button text based on loading state', () => {
        const component = hunkComponent('src/test.js', 0);
        expect(component.getButtonText('before')).toContain('Expand');
        component.loading.before = true;
        expect(component.getButtonText('before')).toBe('...');
    });

    it('calls expandContext and clears loading', async() => {
        const component = hunkComponent('src/test.js', 2);
        const button = document.createElement('button');
        document.body.appendChild(button);

        await component.expand({ target: button }, 'after');

        expect(window.expandContext).toHaveBeenCalledWith(
            button,
            'src/test.js',
            2,
            'after',
            10,
            'pygments'
        );
        expect(component.loading.after).toBe(false);
    });
});
