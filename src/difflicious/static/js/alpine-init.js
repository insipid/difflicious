/**
 * Alpine.js Initialization
 * Sets up Alpine stores and registers global component factories
 */

// Debug flag - reads from DIFFLICIOUS_DEBUG env var (set in base.html template)
const DEBUG = window.DIFFLICIOUS_DEBUG || false;

if (DEBUG) console.log('[Alpine] alpine-init.js loading...');

import Alpine from 'alpinejs';

if (DEBUG) console.log('[Alpine] Alpine module imported:', Alpine);

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
    if (DEBUG) console.log('[Alpine] alpine:init event fired, registering stores...');

    // Register stores
    // NOTE: Alpine.js automatically calls init() on stores when registered
    // Do NOT manually call .init() as it causes double initialization
    Alpine.store('diff', diffStore);
    Alpine.store('search', searchStore);
    Alpine.store('theme', themeStore);

    if (DEBUG) console.log('[Alpine] Stores registered:', {
        diff: Alpine.store('diff'),
        search: Alpine.store('search'),
        theme: Alpine.store('theme')
    });
});

// Start Alpine after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (DEBUG) console.log('[Alpine] Starting Alpine.js (after DOMContentLoaded)');
        Alpine.start();
        if (DEBUG) console.log('[Alpine] Alpine.js started');
    });
} else {
    // DOM is already ready
    if (DEBUG) console.log('[Alpine] Starting Alpine.js (DOM already ready)');
    Alpine.start();
    if (DEBUG) console.log('[Alpine] Alpine.js started');
}

export default Alpine;
