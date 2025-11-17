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
if (typeof CSS === 'undefined') {
    global.CSS = {
        escape: (str) => str.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, '\\$&')
    };
}

// Mock requestAnimationFrame
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
