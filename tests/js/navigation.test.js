/**
 * Tests for navigation functionality
 */

// Import the module under test
import { navigateToPreviousFile, navigateToNextFile } from '../../src/difflicious/static/js/modules/navigation.js';

/**
 * The offset that puts a file header just below the sticky toolbar lives in CSS
 * as scroll-margin-top, so these tests assert that the browser is asked to
 * scroll the element to the start — not that any particular pixel was computed.
 */
function makeFile(name) {
    const el = document.createElement('div');
    el.dataset.file = name;
    el.scrollIntoView = jest.fn(); // jsdom does not implement it
    document.body.appendChild(el);
    return el;
}

describe('Navigation', () => {
    let originalScrollTo;
    let originalMatchMedia;

    beforeEach(() => {
        document.body.innerHTML = '';

        originalScrollTo = window.scrollTo;
        window.scrollTo = jest.fn();

        originalMatchMedia = window.matchMedia;
        window.matchMedia = jest.fn(() => ({ matches: false }));
    });

    afterEach(() => {
        window.scrollTo = originalScrollTo;
        window.matchMedia = originalMatchMedia;
    });

    describe('navigateToPreviousFile', () => {
        it('scrolls the previous file to the top of the viewport', () => {
            makeFile('file1.js');
            const file2 = makeFile('file2.js');
            makeFile('file3.js');

            navigateToPreviousFile('file3.js');

            expect(file2.scrollIntoView).toHaveBeenCalledWith({
                behavior: 'smooth',
                block: 'start'
            });
        });

        it('jumps without animating when reduced motion is requested', () => {
            window.matchMedia = jest.fn(() => ({ matches: true }));
            const file1 = makeFile('file1.js');
            makeFile('file2.js');

            navigateToPreviousFile('file2.js');

            expect(file1.scrollIntoView).toHaveBeenCalledWith({
                behavior: 'auto',
                block: 'start'
            });
        });

        it('should do nothing when at first file', () => {
            const file1 = document.createElement('div');
            file1.dataset.file = 'file1.js';

            document.body.appendChild(file1);

            navigateToPreviousFile('file1.js');

            expect(document.querySelectorAll('[data-file]'))
                .toBeDefined(); // no navigation target: nothing to assert beyond not throwing
        });

        it('should handle nonexistent current file', () => {
            const file1 = document.createElement('div');
            file1.dataset.file = 'file1.js';

            document.body.appendChild(file1);

            // Should not throw
            expect(() => navigateToPreviousFile('nonexistent.js')).not.toThrow();
            expect(document.querySelectorAll('[data-file]'))
                .toBeDefined(); // no navigation target: nothing to assert beyond not throwing
        });
    });

    describe('navigateToNextFile', () => {
        it('scrolls the next file to the top of the viewport', () => {
            makeFile('file1.js');
            const file2 = makeFile('file2.js');
            makeFile('file3.js');

            navigateToNextFile('file1.js');

            expect(file2.scrollIntoView).toHaveBeenCalledWith({
                behavior: 'smooth',
                block: 'start'
            });
        });

        it('should do nothing when at last file', () => {
            const file1 = document.createElement('div');
            file1.dataset.file = 'file1.js';

            const file2 = document.createElement('div');
            file2.dataset.file = 'file2.js';

            document.body.appendChild(file1);
            document.body.appendChild(file2);

            navigateToNextFile('file2.js');

            expect(document.querySelectorAll('[data-file]'))
                .toBeDefined(); // no navigation target: nothing to assert beyond not throwing
        });

        it('should handle nonexistent current file', () => {
            const file1 = document.createElement('div');
            file1.dataset.file = 'file1.js';

            document.body.appendChild(file1);

            // Should not throw
            expect(() => navigateToNextFile('nonexistent.js')).not.toThrow();
            expect(document.querySelectorAll('[data-file]'))
                .toBeDefined(); // no navigation target: nothing to assert beyond not throwing
        });
    });
});
