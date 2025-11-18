/**
 * Alpine.js Store for Search State Management
 * Manages search query and filter state
 */

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
     * Set search query
     */
    setQuery(newQuery) {
        this.query = newQuery;
    },

    /**
     * Clear search query
     */
    clear() {
        this.query = '';
        this.hiddenFilesCount = 0;
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
