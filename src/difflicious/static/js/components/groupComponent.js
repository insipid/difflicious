/**
 * Group Component
 * Manages diff group (staged/unstaged/untracked) expansion/collapse state using Alpine.js
 */

/**
 * Create a group component instance
 * @param {string} groupKey - Key for the group (e.g., 'staged', 'unstaged', 'untracked')
 * @returns {object} Alpine component object
 */
export function groupComponent(groupKey) {
    return {
        // Props
        groupKey,

        // Computed properties
        get isExpanded() {
            // Get expansion state from the diff store
            return window.Alpine.store('diff').isGroupExpanded(this.groupKey);
        },

        get toggleIcon() {
            return this.isExpanded ? '▼' : '▶';
        },

        // Methods
        toggle() {
            window.Alpine.store('diff').toggleGroup(this.groupKey);
        },

        // Lifecycle
        init() {
            // Component initialization if needed
        }
    };
}

// Make it globally available for use in templates
if (typeof window !== 'undefined') {
    window.groupComponent = groupComponent;
}
