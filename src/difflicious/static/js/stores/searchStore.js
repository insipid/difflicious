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
                console.log('[SearchStore] setTimeout callback executing (from setQuery)');

                // Debug: Try multiple selectors to see what works
                const byDataGroup = document.querySelectorAll('[data-group]');
                const byClass = document.querySelectorAll('.diff-group');

                console.log(`[SearchStore] DEBUG - Elements found:`);
                console.log(`  - [data-group]: ${byDataGroup.length}`);
                console.log(`  - .diff-group: ${byClass.length}`);

                let groupCount = 0;
                let fileCount = 0;
                let groupContentCount = 0;

                // Restore groups (if they exist)
                const groupSelector = byDataGroup.length > 0 ? '[data-group]' : '.diff-group';
                document.querySelectorAll(groupSelector).forEach(groupEl => {
                    groupEl.style.display = '';
                    groupCount++;
                });

                // Also restore group-content divs (for ungrouped views)
                document.querySelectorAll('[data-group-content]').forEach(contentEl => {
                    contentEl.style.display = '';
                    groupContentCount++;
                });

                // Restore files
                document.querySelectorAll('[data-file]').forEach(fileEl => {
                    fileEl.style.display = '';
                    fileCount++;
                });

                console.log(`[SearchStore] Restored ${groupCount} groups, ${groupContentCount} group-content divs, and ${fileCount} files`);
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
            console.log('[SearchStore] setTimeout callback executing');

            // Debug: Try multiple selectors to see what works
            const byDataGroup = document.querySelectorAll('[data-group]');
            const byClass = document.querySelectorAll('.diff-group');
            const bySpaceY = document.querySelectorAll('.space-y-2');
            const allDivs = document.querySelectorAll('div');

            console.log(`[SearchStore] DEBUG - Elements found:`);
            console.log(`  - [data-group]: ${byDataGroup.length}`);
            console.log(`  - .diff-group: ${byClass.length}`);
            console.log(`  - .space-y-2: ${bySpaceY.length}`);
            console.log(`  - all divs: ${allDivs.length}`);

            // If we found any by class, log one to see its structure
            if (byClass.length > 0) {
                console.log(`  - First .diff-group element:`, byClass[0]);
                console.log(`  - Has data-group attr?`, byClass[0].hasAttribute('data-group'));
                console.log(`  - data-group value:`, byClass[0].getAttribute('data-group'));
            }

            // Try to find a group by walking up from a file element
            const fileElements = document.querySelectorAll('[data-file]');
            if (fileElements.length > 0) {
                const firstFile = fileElements[0];
                console.log(`  - First file element:`, firstFile);
                console.log(`  - File's data-file:`, firstFile.getAttribute('data-file'));
                console.log(`  - File's display:`, firstFile.style.display);

                // Walk up to find parent group or group-content
                let parent = firstFile.parentElement;
                let depth = 0;
                while (parent && depth < 10) {
                    console.log(`  - Parent ${depth}:`, parent.tagName, parent.className,
                                parent.getAttribute('data-group'),
                                parent.getAttribute('data-group-content'),
                                `display: "${parent.style.display}"`);
                    if (parent.hasAttribute('data-group') || parent.classList.contains('diff-group')) {
                        console.log(`  - FOUND parent group at depth ${depth}!`);
                        break;
                    }
                    if (parent.hasAttribute('data-group-content')) {
                        console.log(`  - FOUND group-content at depth ${depth}! display: "${parent.style.display}"`);
                        break;
                    }
                    parent = parent.parentElement;
                    depth++;
                }
            }

            let groupCount = 0;
            let fileCount = 0;
            let groupContentCount = 0;

            // Restore groups (if they exist)
            const groupSelector = byDataGroup.length > 0 ? '[data-group]' : '.diff-group';
            document.querySelectorAll(groupSelector).forEach(groupEl => {
                groupEl.style.display = '';
                groupCount++;
            });

            // Also restore group-content divs (for ungrouped views)
            document.querySelectorAll('[data-group-content]').forEach(contentEl => {
                contentEl.style.display = '';
                groupContentCount++;
            });

            // Restore files
            document.querySelectorAll('[data-file]').forEach(fileEl => {
                fileEl.style.display = '';
                fileCount++;
            });

            console.log(`[SearchStore] Restored ${groupCount} groups, ${groupContentCount} group-content divs, and ${fileCount} files`);

            // Check again after a short delay to see if something is re-hiding them
            setTimeout(() => {
                const groupContentEl = document.querySelector('[data-group-content]');
                const firstFileEl = document.querySelector('[data-file]');
                console.log('[SearchStore] AFTER restoration check:');
                console.log('  - group-content display:', groupContentEl ? groupContentEl.style.display : 'not found');
                console.log('  - first file display:', firstFileEl ? firstFileEl.style.display : 'not found');

                if (groupContentEl) {
                    console.log('  - group-content computed display:', window.getComputedStyle(groupContentEl).display);
                }
                if (firstFileEl) {
                    console.log('  - first file computed display:', window.getComputedStyle(firstFileEl).display);
                }
            }, 100);
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
