/**
 * Main entry point for difflicious diff viewer
 * Coordinates all modules and initializes the application
 */

import { DiffState, setDebug as setStateDebug } from './modules/state.js';
import { toggleFile, toggleGroup, expandAllFiles, collapseAllFiles } from './modules/file-operations.js';
import { navigateToPreviousFile, navigateToNextFile } from './modules/navigation.js';
import { toggleTheme, setDebug as setThemeDebug } from './modules/theme.js';
import { expandContext } from './modules/context-expansion.js';
import { loadFullDiff } from './modules/full-diff.js';
import { setDebug as setHunkDebug } from './modules/hunk-operations.js';
import { setDebug as setContextUIDebug } from './modules/context-expansion-ui.js';
import { setDebug as setExpansionDebug } from './modules/context-expansion.js';
import { $$ } from './modules/dom-utils.js';

// Debug toggle - set to false for production
const DEBUG = false;

// Propagate DEBUG flag to all modules
setStateDebug(DEBUG);
setThemeDebug(DEBUG);
setHunkDebug(DEBUG);
setContextUIDebug(DEBUG);
setExpansionDebug(DEBUG);

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Note: Theme is now handled by Alpine.js theme store (alpine-init.js)
    // initializeTheme() call removed to avoid conflict with Alpine.js

    // Initialize state (which binds event listeners and restores state)
    await DiffState.init();

    // Ensure all expansion buttons are enabled and functional
    // This runs once after state restoration is complete
    requestAnimationFrame(() => {
        if (DEBUG) console.log('Initializing expansion buttons...');
        const buttons = $$('.expansion-btn');
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

// Export functions to window for HTML onclick handlers
window.toggleFile = toggleFile;
window.toggleGroup = toggleGroup;
window.expandAllFiles = expandAllFiles;
window.collapseAllFiles = collapseAllFiles;
window.navigateToPreviousFile = navigateToPreviousFile;
window.navigateToNextFile = navigateToNextFile;
window.expandContext = expandContext;
window.toggleTheme = toggleTheme;
window.loadFullDiff = loadFullDiff;

// Expose __loadFullDiff to satisfy eslint (as in original code)
window.__loadFullDiff = loadFullDiff;

// Export DiffState for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DiffState,
        toggleFile,
        toggleGroup,
        expandAllFiles,
        collapseAllFiles,
        navigateToPreviousFile,
        navigateToNextFile,
        expandContext,
        toggleTheme,
        loadFullDiff
    };
}
