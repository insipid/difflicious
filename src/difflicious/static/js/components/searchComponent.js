/**
 * Alpine.js Search Component
 * Provides reactive search functionality with keyboard shortcuts
 */

export function searchComponent() {
    return {
        /**
         * Initialize the component
         */
        init() {
            // Focus input on / key (global)
            window.addEventListener('keydown', (e) => {
                // Only trigger if not in an input/textarea and slash key is pressed
                if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                    e.preventDefault();
                    this.$refs.searchInput?.focus();
                }
            });
        },

        /**
         * Get current query from store
         */
        get query() {
            return this.$store.search.query;
        },

        /**
         * Set query in store
         */
        set query(value) {
            this.$store.search.setQuery(value);
        },

        /**
         * Get hidden files count from store
         */
        get hiddenCount() {
            return this.$store.search.hiddenFilesCount;
        },

        /**
         * Get hidden count text
         */
        get hiddenCountText() {
            return this.$store.search.hiddenCountText;
        },

        /**
         * Check if search is active
         */
        get isActive() {
            return this.$store.search.isActive;
        },

        /**
         * Clear the search query
         */
        clear() {
            this.$store.search.clear();
            this.$refs.searchInput?.focus();
        },

        /**
         * Focus the search input
         */
        focus() {
            this.$refs.searchInput?.focus();
        },

        /**
         * Handle escape key
         */
        handleEscape() {
            if (this.isActive) {
                this.clear();
            } else {
                this.$refs.searchInput?.blur();
            }
        }
    };
}
