/**
 * Tests for search and filtering functionality
 */

import { JSDOM } from 'jsdom';

// Set up DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);

// Import the module under test
import { buildSearchRegex, applyFilenameFilter, upsertHiddenBanner } from '../../src/difflicious/static/js/modules/search.js';

describe('Search', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    describe('buildSearchRegex', () => {
        it('should build regex from single word', () => {
            const regex = buildSearchRegex('test');
            expect(regex).toBeTruthy();
            expect(regex.test('test.js')).toBe(true);
            expect(regex.test('my-test-file.js')).toBe(true);
        });

        it('should build regex from multiple words', () => {
            const regex = buildSearchRegex('test file');
            expect(regex).toBeTruthy();
            // Should match if both words appear in order
            expect(regex.test('test-my-file.js')).toBe(true);
            expect(regex.test('file-test.js')).toBe(false); // Wrong order
        });

        it('should be case insensitive by default', () => {
            const regex = buildSearchRegex('test');
            expect(regex.test('Test.js')).toBe(true);
            expect(regex.test('TEST.js')).toBe(true);
        });

        it('should be case sensitive when uppercase letters in query', () => {
            const regex = buildSearchRegex('Test');
            expect(regex.test('Test.js')).toBe(true);
            expect(regex.test('test.js')).toBe(false);
        });

        it('should handle empty query', () => {
            expect(buildSearchRegex('')).toBeNull();
            expect(buildSearchRegex('   ')).toBeNull();
            expect(buildSearchRegex(null)).toBeNull();
        });

        it('should escape special regex characters', () => {
            const regex = buildSearchRegex('test.file');
            expect(regex).toBeTruthy();
            // Dot should be literal, not match any character
            expect(regex.test('test.file')).toBe(true);
            expect(regex.test('testXfile')).toBe(false);
        });
    });

    describe('applyFilenameFilter', () => {
        beforeEach(() => {
            // Create mock file structure
            document.body.innerHTML = `
                <div data-file="src/test.js">
                    <div class="file-header"><span class="font-mono">src/test.js</span></div>
                </div>
                <div data-file-content="src/test.js" style="display: block;"></div>

                <div data-file="src/utils.js">
                    <div class="file-header"><span class="font-mono">src/utils.js</span></div>
                </div>
                <div data-file-content="src/utils.js" style="display: block;"></div>

                <div data-file="README.md">
                    <div class="file-header"><span class="font-mono">README.md</span></div>
                </div>
                <div data-file-content="README.md" style="display: block;"></div>

                <div id="hidden-files-banner" style="display: none;"></div>
            `;
        });

        it('should show all files when query is empty', (done) => {
            applyFilenameFilter('');

            setTimeout(() => {
                const files = document.querySelectorAll('[data-file]');
                files.forEach(file => {
                    expect(file.style.display).not.toBe('none');
                });

                const banner = document.getElementById('hidden-files-banner');
                expect(banner.style.display).toBe('none');
                done();
            }, 50);
        });

        it('should filter files by query', (done) => {
            applyFilenameFilter('test');

            setTimeout(() => {
                const testFile = document.querySelector('[data-file="src/test.js"]');
                const utilsFile = document.querySelector('[data-file="src/utils.js"]');
                const readmeFile = document.querySelector('[data-file="README.md"]');

                expect(testFile.style.display).not.toBe('none');
                expect(utilsFile.style.display).toBe('none');
                expect(readmeFile.style.display).toBe('none');

                const banner = document.getElementById('hidden-files-banner');
                expect(banner.style.display).toBe('');
                expect(banner.textContent).toBe('2 files hidden by search');
                done();
            }, 50);
        });

        it('should be case insensitive by default', (done) => {
            applyFilenameFilter('README');

            setTimeout(() => {
                const readmeFile = document.querySelector('[data-file="README.md"]');
                expect(readmeFile.style.display).not.toBe('none');
                done();
            }, 50);
        });
    });

    describe('upsertHiddenBanner', () => {
        beforeEach(() => {
            document.body.innerHTML = '<div id="hidden-files-banner" style="display: none;"></div>';
        });

        it('should show banner with correct count', () => {
            upsertHiddenBanner(5);
            const banner = document.getElementById('hidden-files-banner');
            expect(banner.style.display).toBe('');
            expect(banner.textContent).toBe('5 files hidden by search');
        });

        it('should handle singular vs plural', () => {
            upsertHiddenBanner(1);
            const banner = document.getElementById('hidden-files-banner');
            expect(banner.textContent).toBe('1 file hidden by search');

            upsertHiddenBanner(2);
            expect(banner.textContent).toBe('2 files hidden by search');
        });

        it('should hide banner when count is zero', () => {
            upsertHiddenBanner(0);
            const banner = document.getElementById('hidden-files-banner');
            expect(banner.style.display).toBe('none');
        });

        it('should handle missing banner element', () => {
            document.body.innerHTML = '';
            // Should not throw
            expect(() => upsertHiddenBanner(5)).not.toThrow();
        });
    });
});
