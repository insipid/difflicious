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

// Start Alpine
Alpine.start();

// Export Alpine for use in components
window.Alpine = Alpine;

// Register component factories globally
window.fileComponent = fileComponent;

export default Alpine;
