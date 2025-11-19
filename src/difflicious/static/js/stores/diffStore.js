/**
 * Alpine.js Store for Diff State Management
 * Manages file and group expansion state with localStorage persistence
 * Using objects instead of Sets for better Alpine.js reactivity
 */

export default {
    // State - using objects for better Alpine.js reactivity
    repositoryName: '',
    expandedFiles: {}, // { filePath: true }
    expandedGroups: { untracked: true, unstaged: true, staged: true },

    // Computed
    get storageKey() {
        return `difflicious-${this.repositoryName || 'default'}`;
    },

    /**
     * Initialize the store
     */
    async init() {
        console.log('[DiffStore] Initializing diff store...');
        await this.initializeRepository();
        this.restoreState();
        console.log('[DiffStore] Diff store initialized:', {
            repositoryName: this.repositoryName,
            expandedFiles: Object.keys(this.expandedFiles).length,
            expandedGroups: this.expandedGroups
        });
    },

    /**
     * Fetch repository name from API
     */
    async initializeRepository() {
        try {
            const response = await fetch('/api/git/status');
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
        return !!this.expandedFiles[filePath];
    },

    /**
     * Check if a group is expanded
     */
    isGroupExpanded(groupKey) {
        return !!this.expandedGroups[groupKey];
    },

    /**
     * Toggle file expansion state
     */
    toggleFile(filePath) {
        console.log('[DiffStore] Toggle file:', filePath, 'current:', this.expandedFiles[filePath]);
        if (this.expandedFiles[filePath]) {
            delete this.expandedFiles[filePath];
        } else {
            this.expandedFiles[filePath] = true;
        }
        // Trigger Alpine.js reactivity
        this.expandedFiles = { ...this.expandedFiles };
        this.saveState();
        console.log('[DiffStore] After toggle:', filePath, 'new:', this.expandedFiles[filePath]);
    },

    /**
     * Toggle group expansion state
     */
    toggleGroup(groupKey) {
        this.expandedGroups[groupKey] = !this.expandedGroups[groupKey];
        // Trigger Alpine.js reactivity
        this.expandedGroups = { ...this.expandedGroups };
        this.saveState();
    },

    /**
     * Get all file paths from the DOM
     */
    getAllFilePaths() {
        const fileElements = document.querySelectorAll('[data-file]');
        return Array.from(fileElements).map(el => el.getAttribute('data-file'));
    },

    /**
     * Expand all files (reads from DOM)
     */
    expandAllFiles() {
        console.log('[DiffStore] Expand all files');
        const filePaths = this.getAllFilePaths();
        filePaths.forEach(filePath => {
            this.expandedFiles[filePath] = true;
        });
        // Trigger Alpine.js reactivity
        this.expandedFiles = { ...this.expandedFiles };
        this.saveState();
        console.log('[DiffStore] Expanded files:', Object.keys(this.expandedFiles).length);
    },

    /**
     * Expand all files (with provided file paths)
     */
    expandAll(filePaths) {
        filePaths.forEach(filePath => {
            this.expandedFiles[filePath] = true;
        });
        // Trigger Alpine.js reactivity
        this.expandedFiles = { ...this.expandedFiles };
        this.saveState();
    },

    /**
     * Collapse all files
     */
    collapseAllFiles() {
        console.log('[DiffStore] Collapse all files');
        this.expandedFiles = {};
        this.saveState();
        console.log('[DiffStore] All files collapsed');
    },

    /**
     * Collapse all files (legacy alias)
     */
    collapseAll() {
        this.collapseAllFiles();
    },

    /**
     * Set file expansion state
     */
    setFileExpanded(filePath, isExpanded) {
        if (isExpanded) {
            this.expandedFiles[filePath] = true;
        } else {
            delete this.expandedFiles[filePath];
        }
        // Trigger Alpine.js reactivity
        this.expandedFiles = { ...this.expandedFiles };
        this.saveState();
    },

    /**
     * Save state to localStorage
     */
    saveState() {
        const state = {
            expandedFiles: Object.keys(this.expandedFiles).filter(k => this.expandedFiles[k]),
            expandedGroups: Object.keys(this.expandedGroups).filter(k => this.expandedGroups[k]),
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
                    this.expandedFiles = {};
                    state.expandedFiles.forEach(filePath => {
                        this.expandedFiles[filePath] = true;
                    });
                }

                // Restore group expansion states
                if (state.expandedGroups && Array.isArray(state.expandedGroups)) {
                    this.expandedGroups = { untracked: false, unstaged: false, staged: false };
                    state.expandedGroups.forEach(groupKey => {
                        this.expandedGroups[groupKey] = true;
                    });
                }
            } catch (e) {
                console.warn('Failed to restore diff state:', e);
            }
        }
    }
};
