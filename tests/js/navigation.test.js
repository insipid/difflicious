/**
 * Tests for navigation functionality
 */

// Import the module under test
import { navigateToPreviousFile, navigateToNextFile } from '../../src/difflicious/static/js/modules/navigation.js';

describe('Navigation', () => {
    let originalScrollTo;
    let originalGetComputedStyle;

    beforeEach(() => {
        document.body.innerHTML = '';

        // Mock window.scrollTo
        originalScrollTo = window.scrollTo;
        window.scrollTo = jest.fn();

        // Mock getComputedStyle for CSS variables
        originalGetComputedStyle = window.getComputedStyle;
        window.getComputedStyle = jest.fn(() => ({
            getPropertyValue: (prop) => {
                if (prop === '--file-header-sticky-offset') {
                    return '1rem';
                }
                return '';
            },
            fontSize: '16px'
        }));
    });

    afterEach(() => {
        window.scrollTo = originalScrollTo;
        window.getComputedStyle = originalGetComputedStyle;
    });

    describe('navigateToPreviousFile', () => {
        it('should scroll to previous file accounting for sticky header offset', () => {
            // Create mock files
            const file1 = document.createElement('div');
            file1.dataset.file = 'file1.js';
            file1.getBoundingClientRect = jest.fn(() => ({ top: 100 }));

            const file2 = document.createElement('div');
            file2.dataset.file = 'file2.js';
            file2.getBoundingClientRect = jest.fn(() => ({ top: 500 }));

            const file3 = document.createElement('div');
            file3.dataset.file = 'file3.js';
            file3.getBoundingClientRect = jest.fn(() => ({ top: 1000 }));

            document.body.appendChild(file1);
            document.body.appendChild(file2);
            document.body.appendChild(file3);

            // Mock current scroll position
            Object.defineProperty(window, 'pageYOffset', { value: 2000, writable: true });

            // Navigate from file3 to file2
            navigateToPreviousFile('file3.js');

            // Should call window.scrollTo with calculated position
            // Expected: currentScroll (2000) + elementTop (500) - stickyOffset (16)
            expect(window.scrollTo).toHaveBeenCalledWith({
                top: 2484, // 2000 + 500 - 16
                behavior: 'smooth'
            });
        });

        it('should do nothing when at first file', () => {
            const file1 = document.createElement('div');
            file1.dataset.file = 'file1.js';

            document.body.appendChild(file1);

            navigateToPreviousFile('file1.js');

            expect(window.scrollTo).not.toHaveBeenCalled();
        });

        it('should handle nonexistent current file', () => {
            const file1 = document.createElement('div');
            file1.dataset.file = 'file1.js';

            document.body.appendChild(file1);

            // Should not throw
            expect(() => navigateToPreviousFile('nonexistent.js')).not.toThrow();
            expect(window.scrollTo).not.toHaveBeenCalled();
        });
    });

    describe('navigateToNextFile', () => {
        it('should scroll to next file accounting for sticky header offset', () => {
            const file1 = document.createElement('div');
            file1.dataset.file = 'file1.js';
            file1.getBoundingClientRect = jest.fn(() => ({ top: 100 }));

            const file2 = document.createElement('div');
            file2.dataset.file = 'file2.js';
            file2.getBoundingClientRect = jest.fn(() => ({ top: 500 }));

            const file3 = document.createElement('div');
            file3.dataset.file = 'file3.js';
            file3.getBoundingClientRect = jest.fn(() => ({ top: 1000 }));

            document.body.appendChild(file1);
            document.body.appendChild(file2);
            document.body.appendChild(file3);

            // Mock current scroll position
            Object.defineProperty(window, 'pageYOffset', { value: 1000, writable: true });

            // Navigate from file1 to file2
            navigateToNextFile('file1.js');

            // Should call window.scrollTo with calculated position
            // Expected: currentScroll (1000) + elementTop (500) - stickyOffset (16)
            expect(window.scrollTo).toHaveBeenCalledWith({
                top: 1484, // 1000 + 500 - 16
                behavior: 'smooth'
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

            expect(window.scrollTo).not.toHaveBeenCalled();
        });

        it('should handle nonexistent current file', () => {
            const file1 = document.createElement('div');
            file1.dataset.file = 'file1.js';

            document.body.appendChild(file1);

            // Should not throw
            expect(() => navigateToNextFile('nonexistent.js')).not.toThrow();
            expect(window.scrollTo).not.toHaveBeenCalled();
        });
    });
});
