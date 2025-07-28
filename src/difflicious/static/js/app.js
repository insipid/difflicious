/**
 * Difflicious Alpine.js Application
 * Main application logic for git diff visualization
 */

function diffApp() {
    return {
        // Application state
        loading: false,
        gitStatus: {
            current_branch: '',
            files_changed: 0,
            git_available: false
        },
        diffs: [],
        
        // UI state
        showOnlyChanged: true,
        searchFilter: '',
        
        // Computed properties
        get filteredDiffs() {
            let filtered = this.diffs;
            
            // Filter by search term
            if (this.searchFilter.trim()) {
                const search = this.searchFilter.toLowerCase();
                filtered = filtered.filter(diff => 
                    diff.path.toLowerCase().includes(search)
                );
            }
            
            // Filter by changed files only
            if (this.showOnlyChanged) {
                filtered = filtered.filter(diff => 
                    diff.additions > 0 || diff.deletions > 0
                );
            }
            
            return filtered;
        },
        
        // Check if all visible diffs are expanded
        get allExpanded() {
            return this.filteredDiffs.length > 0 && this.filteredDiffs.every(diff => diff.expanded);
        },
        
        // Check if all visible diffs are collapsed
        get allCollapsed() {
            return this.filteredDiffs.length > 0 && this.filteredDiffs.every(diff => !diff.expanded);
        },
        
        // Initialize the application
        async init() {
            console.log('🎉 Difflicious initialized');
            await this.loadGitStatus();
            await this.loadDiffs();
        },
        
        // Load git status from API
        async loadGitStatus() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                
                if (data.status === 'ok') {
                    this.gitStatus = {
                        current_branch: data.current_branch || 'unknown',
                        files_changed: data.files_changed || 0,
                        git_available: data.git_available || false
                    };
                }
            } catch (error) {
                console.error('Failed to load git status:', error);
                this.gitStatus = {
                    current_branch: 'error',
                    files_changed: 0,
                    git_available: false
                };
            }
        },
        
        // Load diff data from API
        async loadDiffs() {
            this.loading = true;
            
            try {
                const response = await fetch('/api/diff');
                const data = await response.json();
                
                if (data.status === 'ok') {
                    this.diffs = (data.diffs || []).map(diff => ({
                        ...diff,
                        expanded: true // Add UI state for each diff - start expanded
                    }));
                }
            } catch (error) {
                console.error('Failed to load diffs:', error);
                this.diffs = [];
            } finally {
                this.loading = false;
            }
        },
        
        // Refresh all data
        async refreshData() {
            await Promise.all([
                this.loadGitStatus(),
                this.loadDiffs()
            ]);
        },
        
        // Toggle diff file expansion
        toggleDiff(index) {
            if (this.diffs[index]) {
                this.diffs[index].expanded = !this.diffs[index].expanded;
            }
        },
        
        // Expand all diffs
        expandAll() {
            this.diffs.forEach(diff => {
                diff.expanded = true;
            });
        },
        
        // Collapse all diffs
        collapseAll() {
            this.diffs.forEach(diff => {
                diff.expanded = false;
            });
        }
    };
}