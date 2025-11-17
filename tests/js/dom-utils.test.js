/**
 * Tests for DOM utility functions
 */

// Import JSDOM for testing
import { JSDOM } from 'jsdom';

// Set up DOM environment
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document;
global.window = dom.window;

// Import the module under test
import { $, $$, escapeHtml, escapeRegExp, isHighlightedContent } from '../../src/difflicious/static/js/modules/dom-utils.js';

describe('DOM Utils', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    describe('$ (querySelector shorthand)', () => {
        it('should return first matching element', () => {
            document.body.innerHTML = `
                <div class="test">First</div>
                <div class="test">Second</div>
            `;

            const result = $('.test');
            expect(result).toBeTruthy();
            expect(result.textContent).toBe('First');
        });

        it('should return null when no elements match', () => {
            const result = $('.nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('$$ (querySelectorAll shorthand)', () => {
        it('should return all matching elements', () => {
            document.body.innerHTML = `
                <div class="test">First</div>
                <div class="test">Second</div>
                <div class="test">Third</div>
            `;

            const result = $$('.test');
            expect(result.length).toBe(3);
            expect(Array.from(result).map(el => el.textContent)).toEqual(['First', 'Second', 'Third']);
        });

        it('should return empty NodeList when no elements match', () => {
            const result = $$('.nonexistent');
            expect(result.length).toBe(0);
        });
    });

    describe('escapeHtml', () => {
        it('should escape HTML special characters', () => {
            expect(escapeHtml('<script>alert("XSS")</script>')).toBe('&lt;script&gt;alert("XSS")&lt;/script&gt;');
            expect(escapeHtml('Hello & goodbye')).toBe('Hello &amp; goodbye');
            expect(escapeHtml('Quote: "test"')).toBe('Quote: "test"');
        });

        it('should handle empty input', () => {
            expect(escapeHtml('')).toBe('');
            expect(escapeHtml(null)).toBe('');
            expect(escapeHtml(undefined)).toBe('');
        });

        it('should handle plain text', () => {
            expect(escapeHtml('Hello World')).toBe('Hello World');
        });
    });

    describe('escapeRegExp', () => {
        it('should escape regex special characters', () => {
            expect(escapeRegExp('test.file')).toBe('test\\.file');
            expect(escapeRegExp('test*pattern')).toBe('test\\*pattern');
            expect(escapeRegExp('test+pattern')).toBe('test\\+pattern');
            expect(escapeRegExp('test?pattern')).toBe('test\\?pattern');
            expect(escapeRegExp('[a-z]')).toBe('\\[a-z\\]');
            expect(escapeRegExp('(group)')).toBe('\\(group\\)');
            expect(escapeRegExp('test|pattern')).toBe('test\\|pattern');
        });

        it('should handle empty input', () => {
            expect(escapeRegExp('')).toBe('');
            expect(escapeRegExp(null)).toBe('');
            expect(escapeRegExp(undefined)).toBe('');
        });

        it('should handle plain text without special characters', () => {
            expect(escapeRegExp('hello')).toBe('hello');
        });
    });

    describe('isHighlightedContent', () => {
        it('should detect span tags', () => {
            expect(isHighlightedContent('<span class="highlight">code</span>')).toBe(true);
        });

        it('should detect HTML entities', () => {
            expect(isHighlightedContent('Hello&nbsp;World')).toBe(true);
            expect(isHighlightedContent('&lt;tag&gt;')).toBe(true);
            expect(isHighlightedContent('A &amp; B')).toBe(true);
        });

        it('should detect code tags', () => {
            expect(isHighlightedContent('<code>function test() {}</code>')).toBe(true);
        });

        it('should detect em and strong tags', () => {
            expect(isHighlightedContent('<em>emphasized</em>')).toBe(true);
            expect(isHighlightedContent('<strong>bold</strong>')).toBe(true);
        });

        it('should return false for plain text', () => {
            expect(isHighlightedContent('plain text')).toBe(false);
            expect(isHighlightedContent('Hello World')).toBe(false);
        });

        it('should handle empty input', () => {
            expect(isHighlightedContent('')).toBe(false);
            expect(isHighlightedContent(null)).toBe(false);
            expect(isHighlightedContent(undefined)).toBe(false);
        });
    });
});
