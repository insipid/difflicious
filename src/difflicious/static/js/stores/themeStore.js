/**
 * Alpine.js Store for Theme Management
 * Handles light/dark theme switching and persistence
 */

// Debug flag - reads from DIFFLICIOUS_DEBUG env var (set in base.html template)
const DEBUG = window.DIFFLICIOUS_DEBUG || false;

export default {
    // State
    current: 'light',

    /**
     * Initialize the theme store
     */
    init() {
        if (DEBUG) console.log('[ThemeStore] Initializing theme store...');

        const savedTheme = localStorage.getItem('difflicious-theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        // Also check current DOM state (set by inline script)
        const currentDomTheme = document.documentElement.getAttribute('data-theme');

        this.current = savedTheme || currentDomTheme || (systemPrefersDark ? 'dark' : 'light');

        if (DEBUG) {
            console.log('[ThemeStore] Theme initialized:', {
                savedTheme,
                systemPrefersDark,
                currentDomTheme,
                current: this.current,
                icon: this.icon
            });
        }

        // Apply theme to document
        this.applyTheme();

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('difflicious-theme')) {
                this.current = e.matches ? 'dark' : 'light';
                this.applyTheme();
            }
        });
    },

    /**
     * Toggle between light and dark theme
     */
    toggle() {
        if (DEBUG) console.log('[ThemeStore] Toggle called, current theme:', this.current);

        const htmlElement = document.documentElement;

        // Disable transitions to prevent flicker during theme switch
        htmlElement.classList.add('theme-transitioning');

        // Force a synchronous reflow to ensure the class is applied
        // eslint-disable-next-line no-unused-expressions
        htmlElement.offsetHeight;

        // Toggle theme
        this.current = this.current === 'dark' ? 'light' : 'dark';

        // Apply theme change
        this.applyTheme();

        // Force another reflow to ensure the theme change is applied
        // eslint-disable-next-line no-unused-expressions
        htmlElement.offsetHeight;

        // Save theme preference
        localStorage.setItem('difflicious-theme', this.current);

        // Re-enable transitions after a brief delay
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                htmlElement.classList.remove('theme-transitioning');
            });
        });

        return false; // Prevent any form submission
    },

    /**
     * Apply the current theme to the document
     */
    applyTheme() {
        const htmlElement = document.documentElement;
        if (this.current === 'dark') {
            htmlElement.setAttribute('data-theme', 'dark');
        } else {
            htmlElement.removeAttribute('data-theme');
        }
    },

    /**
     * Get the theme icon
     */
    get icon() {
        return this.current === 'dark' ? '🌙' : '☀️';
    },

    /**
     * Check if dark theme is active
     */
    get isDark() {
        return this.current === 'dark';
    },

    /**
     * Check if light theme is active
     */
    get isLight() {
        return this.current === 'light';
    }
};
