/**
 * Alpine.js Store for Search State Management
 * Manages search query and filter state
 */

import { applyFilenameFilter } from '../modules/search.js';

export default {
    // State
    query: '',
    hiddenFilesCount: 0,

    /**
     * Initialize the store
     */
    init() {
        // Restore search query from URL or localStorage if needed
        this.query = '';
    },

    /**
     * Set search query and apply filter
     */
    setQuery(newQuery) {
        this.query = newQuery;
        // Apply the filter using vanilla JS function
        this.applyFilter();
    },

    /**
     * Apply the current search filter to files
     */
    applyFilter() {
        applyFilenameFilter(this.query);
        // Count hidden files
        const fileElements = document.querySelectorAll('[data-file]');
        let hiddenCount = 0;
        fileElements.forEach(fileEl => {
            if (fileEl.style.display === 'none') {
                hiddenCount++;
            }
        });
        this.hiddenFilesCount = hiddenCount;
    },

    /**
     * Clear search query and reset filter
     */
    clear() {
        this.query = '';
        this.hiddenFilesCount = 0;
        // Apply empty filter to show all files
        applyFilenameFilter('');
    },

    /**
     * Update hidden files count
     */
    setHiddenCount(count) {
        this.hiddenFilesCount = count;
    },

    /**
     * Get hidden count text for display
     */
    get hiddenCountText() {
        if (this.hiddenFilesCount === 0) return '';
        const plural = this.hiddenFilesCount === 1 ? '' : 's';
        return `${this.hiddenFilesCount} file${plural} hidden by search`;
    },

    /**
     * Check if search is active
     */
    get isActive() {
        return this.query.length > 0;
    }
};
