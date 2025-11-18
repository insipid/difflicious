/**
 * Alpine.js Store for Diff State Management
 * Manages file and group expansion state with localStorage persistence
 */

export default {
    // State
    repositoryName: '',
    expandedFiles: new Set(),
    expandedGroups: new Set(['untracked', 'unstaged', 'staged']),

    // Computed
    get storageKey() {
        return `difflicious-${this.repositoryName || 'default'}`;
    },

    /**
     * Initialize the store
     */
    async init() {
        await this.initializeRepository();
        this.restoreState();
    },

    /**
     * Fetch repository name from API
     */
    async initializeRepository() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            if (data.status === 'ok' && data.repository_name) {
                this.repositoryName = data.repository_name;
            }
        } catch (error) {
            console.warn('Error fetching repository info:', error);
        }
    },

    /**
     * Check if a file is expanded
     */
    isFileExpanded(filePath) {
        return this.expandedFiles.has(filePath);
    },

    /**
     * Check if a group is expanded
     */
    isGroupExpanded(groupKey) {
        return this.expandedGroups.has(groupKey);
    },

    /**
     * Toggle file expansion state
     */
    toggleFile(filePath) {
        if (this.expandedFiles.has(filePath)) {
            this.expandedFiles.delete(filePath);
        } else {
            this.expandedFiles.add(filePath);
        }
        // Trigger reactivity by reassigning
        this.expandedFiles = new Set(this.expandedFiles);
        this.saveState();
    },

    /**
     * Toggle group expansion state
     */
    toggleGroup(groupKey) {
        if (this.expandedGroups.has(groupKey)) {
            this.expandedGroups.delete(groupKey);
        } else {
            this.expandedGroups.add(groupKey);
        }
        // Trigger reactivity by reassigning
        this.expandedGroups = new Set(this.expandedGroups);
        this.saveState();
    },

    /**
     * Expand all files
     */
    expandAll(filePaths) {
        filePaths.forEach(filePath => this.expandedFiles.add(filePath));
        // Trigger reactivity by reassigning
        this.expandedFiles = new Set(this.expandedFiles);
        this.saveState();
    },

    /**
     * Collapse all files
     */
    collapseAll() {
        this.expandedFiles.clear();
        // Trigger reactivity by reassigning
        this.expandedFiles = new Set(this.expandedFiles);
        this.saveState();
    },

    /**
     * Set file expansion state
     */
    setFileExpanded(filePath, isExpanded) {
        if (isExpanded) {
            this.expandedFiles.add(filePath);
        } else {
            this.expandedFiles.delete(filePath);
        }
        // Trigger reactivity by reassigning
        this.expandedFiles = new Set(this.expandedFiles);
        this.saveState();
    },

    /**
     * Save state to localStorage
     */
    saveState() {
        const state = {
            expandedFiles: Array.from(this.expandedFiles),
            expandedGroups: Array.from(this.expandedGroups),
            repositoryName: this.repositoryName,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(state));
    },

    /**
     * Restore state from localStorage
     */
    restoreState() {
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                const state = JSON.parse(saved);

                // Restore file expansion states
                if (state.expandedFiles && Array.isArray(state.expandedFiles)) {
                    this.expandedFiles = new Set(state.expandedFiles);
                }

                // Restore group expansion states
                if (state.expandedGroups && Array.isArray(state.expandedGroups)) {
                    this.expandedGroups = new Set(state.expandedGroups);
                }
            } catch (e) {
                console.warn('Failed to restore diff state:', e);
            }
        }
    }
};
