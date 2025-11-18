/**
 * File Component
 * Manages individual file expansion/collapse state using Alpine.js
 */

/**
 * Create a file component instance
 * @param {string} filePath - Path to the file
 * @returns {object} Alpine component object
 */
export function fileComponent(filePath) {
    return {
        // Props
        filePath,

        // Computed properties
        get isExpanded() {
            // Get expansion state from the diff store
            return window.Alpine.store('diff').isFileExpanded(this.filePath);
        },

        get toggleIcon() {
            return this.isExpanded ? '▼' : '▶';
        },

        // Methods
        toggle() {
            window.Alpine.store('diff').toggleFile(this.filePath);
        },

        // Lifecycle
        init() {
            // Component initialization if needed
        }
    };
}

// Make it globally available for use in templates
if (typeof window !== 'undefined') {
    window.fileComponent = fileComponent;
}
