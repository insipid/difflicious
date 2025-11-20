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
            console.log('[SearchStore] Initial search query:', initialQuery);
            this.query = initialQuery;
            // Defer filter application until after DOM is fully ready
            // This ensures all file elements are in the DOM before filtering
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    console.log('[SearchStore] Applying initial filter after DOM ready');
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
        console.log('[SearchStore] setQuery called with:', newQuery);
        this.query = newQuery;

        // Apply the filter using vanilla JS function
        this.applyFilter();

        // If clearing the query, explicitly show all groups and files after a delay
        // The delay ensures applyFilenameFilter's RAF callback has completed
        if (!newQuery || newQuery.trim() === '') {
            console.log('[SearchStore] Empty query detected, will restore visibility');
            setTimeout(() => {
                let groupCount = 0;
                let fileCount = 0;

                document.querySelectorAll('[data-group]').forEach(groupEl => {
                    groupEl.style.display = '';
                    groupCount++;
                });
                document.querySelectorAll('[data-file]').forEach(fileEl => {
                    fileEl.style.display = '';
                    fileCount++;
                });

                console.log(`[SearchStore] Restored ${groupCount} groups and ${fileCount} files`);
            }, 50); // 50ms delay to run after applyFilenameFilter's RAF
        }

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
        console.log('[SearchStore] Clearing search filter');
        this.query = '';
        this.hiddenFilesCount = 0;

        // Apply empty filter to show all files
        applyFilenameFilter('');

        // Explicitly ensure all groups and files are visible after a delay
        // The delay ensures applyFilenameFilter's RAF callback has completed
        setTimeout(() => {
            let groupCount = 0;
            let fileCount = 0;

            document.querySelectorAll('[data-group]').forEach(groupEl => {
                groupEl.style.display = '';
                groupCount++;
            });
            document.querySelectorAll('[data-file]').forEach(fileEl => {
                fileEl.style.display = '';
                fileCount++;
            });

            console.log(`[SearchStore] Restored ${groupCount} groups and ${fileCount} files`);
        }, 50); // 50ms delay to run after applyFilenameFilter's RAF

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
