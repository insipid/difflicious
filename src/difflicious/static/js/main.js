/**
 * Main entry point for difflicious diff viewer
 * Coordinates all modules and initializes the application
 */

import { setDebug as setThemeDebug } from './modules/theme.js';
import { setDebug as setHunkDebug } from './modules/hunk-operations.js';
import { setDebug as setContextUIDebug } from './modules/context-expansion-ui.js';
import { setDebug as setExpansionDebug } from './modules/context-expansion.js';
import { AutoReload, setDebug as setAutoReloadDebug } from './modules/auto-reload.js';
import { $$ } from './modules/dom-utils.js';

// Debug flag - reads from DIFFLICIOUS_DEBUG env var (set in base.html template)
const DEBUG = window.DIFFLICIOUS_DEBUG || false;

// Propagate DEBUG flag to all modules
setThemeDebug(DEBUG);
setHunkDebug(DEBUG);
setContextUIDebug(DEBUG);
setExpansionDebug(DEBUG);
setAutoReloadDebug(DEBUG);

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    // NOTE: State management handled by Alpine.js stores (diffStore, searchStore, themeStore)
    // via alpine-init.js. Theme, expansion state, and search are all Alpine-managed.

    // Initialize auto-reload functionality
    AutoReload.init();

    // Restore scroll position after reload (auto-reload feature)
    requestAnimationFrame(() => {
        const savedScroll = sessionStorage.getItem('difflicious-scroll-position');
        if (savedScroll) {
            window.scrollTo(0, parseInt(savedScroll, 10));
            sessionStorage.removeItem('difflicious-scroll-position');
        }
    });

    // Ensure all expansion buttons are enabled and functional
    // This runs once after state restoration is complete
    requestAnimationFrame(() => {
        if (DEBUG) console.log('Initializing expansion buttons...');
        const buttons = $$('.js-expansion-btn');
        buttons.forEach((button, index) => {
            const targetStart = parseInt(button.dataset.targetStart);
            const targetEnd = parseInt(button.dataset.targetEnd);

            if (DEBUG) console.log(`Button ${index}: direction=${button.dataset.direction}, targetStart=${targetStart}, targetEnd=${targetEnd}`);

            // Ensure button is properly enabled
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.pointerEvents = 'auto';
            button.title = `Expand 10 lines ${button.dataset.direction} (${targetStart}-${targetEnd})`;

            if (DEBUG) console.log(`Button ${index} enabled and ready`);
        });
    });
});
