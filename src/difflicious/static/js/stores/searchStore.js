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
        // Read initial search query from URL parameter or input field
        const urlParams = new URLSearchParams(window.location.search);
        const urlSearch = urlParams.get('search') || '';

        // Also check if the input has a server-rendered value
        const searchInput = document.querySelector('input[name="search"]');
        const inputValue = searchInput ? searchInput.value : '';

        // Use URL param or input value, whichever is present
        const initialQuery = urlSearch || inputValue || '';

        if (initialQuery) {
            this.query = initialQuery;
            // Defer filter application until after DOM is fully ready
            // This ensures all file elements are in the DOM before filtering
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.applyFilter();
                });
            });
        } else {
            this.query = '';
        }
    },

    /**
     * Set search query and apply filter
     */
    setQuery(newQuery) {
        this.query = newQuery;

        // Apply the filter using vanilla JS function - it handles everything
        this.applyFilter();

        // Update URL with search parameter
        this.updateUrl();
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

        // Apply empty filter to show all files - this should handle everything
        applyFilenameFilter('');

        // Update URL to remove search parameter
        this.updateUrl();
    },

    /**
     * Update URL with current search query
     */
    updateUrl() {
        const url = new URL(window.location);
        if (this.query && this.query.trim()) {
            url.searchParams.set('search', this.query);
        } else {
            url.searchParams.delete('search');
        }
        // Use replaceState to update URL without reloading or adding to history
        window.history.replaceState({}, '', url);
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
