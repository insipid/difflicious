/**
 * Tests for navigation functionality
 */

import { JSDOM } from 'jsdom';

// Set up DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Import the module under test
import { navigateToPreviousFile, navigateToNextFile } from '../../src/difflicious/static/js/modules/navigation.js';

describe('Navigation', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    describe('navigateToPreviousFile', () => {
        it('should scroll to previous file', () => {
            // Create mock files
            const file1 = document.createElement('div');
            file1.dataset.file = 'file1.js';
            file1.scrollIntoView = jest.fn();

            const file2 = document.createElement('div');
            file2.dataset.file = 'file2.js';
            file2.scrollIntoView = jest.fn();

            const file3 = document.createElement('div');
            file3.dataset.file = 'file3.js';
            file3.scrollIntoView = jest.fn();

            document.body.appendChild(file1);
            document.body.appendChild(file2);
            document.body.appendChild(file3);

            // Navigate from file3 to file2
            navigateToPreviousFile('file3.js');

            expect(file2.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
            expect(file1.scrollIntoView).not.toHaveBeenCalled();
        });

        it('should do nothing when at first file', () => {
            const file1 = document.createElement('div');
            file1.dataset.file = 'file1.js';
            file1.scrollIntoView = jest.fn();

            document.body.appendChild(file1);

            navigateToPreviousFile('file1.js');

            expect(file1.scrollIntoView).not.toHaveBeenCalled();
        });

        it('should handle nonexistent current file', () => {
            const file1 = document.createElement('div');
            file1.dataset.file = 'file1.js';
            file1.scrollIntoView = jest.fn();

            document.body.appendChild(file1);

            // Should not throw
            expect(() => navigateToPreviousFile('nonexistent.js')).not.toThrow();
            expect(file1.scrollIntoView).not.toHaveBeenCalled();
        });
    });

    describe('navigateToNextFile', () => {
        it('should scroll to next file', () => {
            const file1 = document.createElement('div');
            file1.dataset.file = 'file1.js';
            file1.scrollIntoView = jest.fn();

            const file2 = document.createElement('div');
            file2.dataset.file = 'file2.js';
            file2.scrollIntoView = jest.fn();

            const file3 = document.createElement('div');
            file3.dataset.file = 'file3.js';
            file3.scrollIntoView = jest.fn();

            document.body.appendChild(file1);
            document.body.appendChild(file2);
            document.body.appendChild(file3);

            // Navigate from file1 to file2
            navigateToNextFile('file1.js');

            expect(file2.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
            expect(file3.scrollIntoView).not.toHaveBeenCalled();
        });

        it('should do nothing when at last file', () => {
            const file1 = document.createElement('div');
            file1.dataset.file = 'file1.js';
            file1.scrollIntoView = jest.fn();

            const file2 = document.createElement('div');
            file2.dataset.file = 'file2.js';
            file2.scrollIntoView = jest.fn();

            document.body.appendChild(file1);
            document.body.appendChild(file2);

            navigateToNextFile('file2.js');

            expect(file1.scrollIntoView).not.toHaveBeenCalled();
            expect(file2.scrollIntoView).not.toHaveBeenCalled();
        });

        it('should handle nonexistent current file', () => {
            const file1 = document.createElement('div');
            file1.dataset.file = 'file1.js';
            file1.scrollIntoView = jest.fn();

            document.body.appendChild(file1);

            // Should not throw
            expect(() => navigateToNextFile('nonexistent.js')).not.toThrow();
            expect(file1.scrollIntoView).not.toHaveBeenCalled();
        });
    });
});
