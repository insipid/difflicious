/**
 * Alpine.js Initialization
 * Sets up Alpine stores and registers global component factories
 */

import Alpine from 'alpinejs';

// Import stores
import diffStore from './stores/diffStore.js';
import searchStore from './stores/searchStore.js';
import themeStore from './stores/themeStore.js';

// Import components
import { fileComponent } from './components/fileComponent.js';
import { groupComponent } from './components/groupComponent.js';
import { searchComponent } from './components/searchComponent.js';
import { hunkComponent } from './components/hunkComponent.js';

// Register component factories globally BEFORE Alpine starts
window.fileComponent = fileComponent;
window.groupComponent = groupComponent;
window.searchComponent = searchComponent;
window.hunkComponent = hunkComponent;

// Export Alpine for use in components
window.Alpine = Alpine;

// Initialize Alpine stores
document.addEventListener('alpine:init', () => {
    // Register stores
    Alpine.store('diff', diffStore);
    Alpine.store('search', searchStore);
    Alpine.store('theme', themeStore);

    // Initialize stores
    Alpine.store('diff').init();
    Alpine.store('search').init();
    Alpine.store('theme').init();
});

// Start Alpine after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        Alpine.start();
    });
} else {
    // DOM is already ready
    Alpine.start();
}

export default Alpine;
