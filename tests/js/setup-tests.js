/**
 * Jest test setup file
 * Sets up global mocks and utilities for testing
 */

// Import the actual context manager function for testing
// In a real browser environment, this would be loaded via script tag
const fs = require('fs');
const path = require('path');

// Load the context manager source code
const contextManagerPath = path.join(__dirname, '../../src/difflicious/static/js/context-manager.js');
const contextManagerSource = fs.readFileSync(contextManagerPath, 'utf8');

// Evaluate the context manager code in global scope
eval(contextManagerSource);

// Make createContextManager available globally for tests
global.createContextManager = createContextManager;

// Setup global mocks
global.console = {
    ...console,
    // Mock console methods to avoid noise in tests while preserving functionality
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Mock URLSearchParams for older environments
if (typeof URLSearchParams === 'undefined') {
    global.URLSearchParams = class URLSearchParams {
        constructor() {
            this.params = new Map();
        }
        
        set(key, value) {
            this.params.set(key, value);
        }
        
        toString() {
            const pairs = [];
            for (const [key, value] of this.params) {
                pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
            }
            return pairs.join('&');
        }
    };
}