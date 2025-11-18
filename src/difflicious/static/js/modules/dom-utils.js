/**
 * DOM manipulation utilities
 * Provides common functions for querying and manipulating the DOM
 */

/**
 * Query selector shorthand - returns first matching element
 * @param {string} selector - CSS selector
 * @returns {Element|null} First matching element or null
 */
export const $ = (selector) => document.querySelector(selector);

/**
 * Query selector all shorthand - returns all matching elements
 * @param {string} selector - CSS selector
 * @returns {NodeList} All matching elements
 */
export const $$ = (selector) => document.querySelectorAll(selector);

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML-safe text
 */
export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Escape special regex characters in a string
 * @param {string} text - Text to escape
 * @returns {string} Regex-safe text
 */
export function escapeRegExp(text) {
    if (!text) return '';
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if content appears to be syntax-highlighted HTML
 * @param {string} content - Content to check
 * @returns {boolean} True if content appears to be HTML
 */
export function isHighlightedContent(content) {
    // Check for HTML tags or entities that indicate syntax highlighting
    if (!content) return false;
    return (
        content.includes('<span') ||
        content.includes('</span>') ||
        content.includes('&nbsp;') ||
        content.includes('&lt;') ||
        content.includes('&gt;') ||
        content.includes('&amp;') ||
        content.includes('<code>') ||
        content.includes('<em>') ||
        content.includes('<strong>')
    );
}
