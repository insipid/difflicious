/**
 * Theme management functionality
 * Handles light/dark theme switching and persistence
 */

import { $ } from './dom-utils.js';

// Debug toggle - can be overridden by main.js
let DEBUG = false;

export function setDebug(value) {
    DEBUG = value;
}

/**
 * Toggle between light and dark theme
 * @returns {boolean} False to prevent form submission
 */
export function toggleTheme() {
    const htmlElement = document.documentElement;
    const isDark = htmlElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';

    // Disable transitions to prevent flicker during theme switch
    htmlElement.classList.add('theme-transitioning');

    // Force a synchronous reflow to ensure the class is applied
    // eslint-disable-next-line no-unused-expressions
    htmlElement.offsetHeight;

    // Apply theme change
    if (isDark) {
        htmlElement.removeAttribute('data-theme');
    } else {
        htmlElement.setAttribute('data-theme', 'dark');
    }

    // Force another reflow to ensure the theme change is applied
    // eslint-disable-next-line no-unused-expressions
    htmlElement.offsetHeight;

    // Update theme icon
    const themeIcon = $('#theme-icon');
    if (themeIcon) {
        themeIcon.textContent = newTheme === 'dark' ? '🌙' : '☀️';
    }

    // Save theme preference
    localStorage.setItem('difflicious-theme', newTheme);

    if (DEBUG) console.log(`Theme switched to ${newTheme}`);

    // Re-enable transitions after a brief delay to allow the browser to process the change
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            htmlElement.classList.remove('theme-transitioning');
        });
    });

    // Prevent any form submission or navigation
    return false;
}

/**
 * Initialize theme based on saved preference or system preference
 */
export function initializeTheme() {
    const savedTheme = localStorage.getItem('difflicious-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    if (defaultTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }

    // Update theme icon
    const themeIcon = $('#theme-icon');
    if (themeIcon) {
        themeIcon.textContent = defaultTheme === 'dark' ? '🌙' : '☀️';
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('difflicious-theme')) {
            toggleTheme();
        }
    });

    return defaultTheme;
}
