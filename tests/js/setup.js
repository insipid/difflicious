/**
 * Jest setup file for ES module support
 */

import { jest } from '@jest/globals';

// Polyfill TextEncoder/TextDecoder for JSDOM
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Make jest available globally
global.jest = jest;

// Mock CSS.escape which is not available in JSDOM
// Note: This is a simplified implementation that does not handle all edge cases:
// - Leading digits (should be escaped with hex notation)
// - Leading hyphens followed by digits (should be escaped)
// - Single hyphen at the start (should be escaped)
// This implementation is sufficient for the current test cases, but should be
// replaced with a full polyfill if more complex CSS selectors are needed.
if (typeof CSS === 'undefined') {
    global.CSS = {
        escape: (str) => str.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&')
    };
}

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
