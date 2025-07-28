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
            repository_name: '',
            files_changed: 0,
            git_available: false
        },
        groups: {
            untracked: {files: [], count: 0, visible: true},
            unstaged: {files: [], count: 0, visible: true},
            staged: {files: [], count: 0, visible: true}
        },
        branches: {
            all: [],
            current: '',
            default: '',
            others: []
        },
        
        // UI state
        showOnlyChanged: true,
        searchFilter: '',
        
        // Branch and diff options
        baseBranch: 'main',
        unstaged: true,
        untracked: true,
        
        // Saved state for restoration
        savedFileExpansions: {},
        
        // LocalStorage utility functions
        getStorageKey() {
            const repoName = this.gitStatus.repository_name || 'unknown';
            return `difflicious.repo.${repoName}`;
        },
        
        saveUIState() {
            if (!this.gitStatus.repository_name) return; // Don't save if no repo name yet
            
            const state = {
                // UI Controls
                baseBranch: this.baseBranch,
                unstaged: this.unstaged,
                untracked: this.untracked,
                showOnlyChanged: this.showOnlyChanged,
                searchFilter: this.searchFilter,
                
                // Group visibility
                groupVisibility: {
                    untracked: this.groups.untracked.visible,
                    unstaged: this.groups.unstaged.visible,
                    staged: this.groups.staged.visible
                },
                
                // File expansion states (by file path)
                fileExpansions: this.getFileExpansionStates()
            };
            
            try {
                localStorage.setItem(this.getStorageKey(), JSON.stringify(state));
            } catch (error) {
                console.warn('Failed to save UI state to localStorage:', error);
            }
        },
        
        loadUIState() {
            if (!this.gitStatus.repository_name) return; // Don't load if no repo name yet
            
            try {
                const saved = localStorage.getItem(this.getStorageKey());
                if (!saved) return;
                
                const state = JSON.parse(saved);
                
                // Restore UI controls
                if (state.baseBranch) this.baseBranch = state.baseBranch;
                if (typeof state.unstaged === 'boolean') this.unstaged = state.unstaged;
                if (typeof state.untracked === 'boolean') this.untracked = state.untracked;
                if (typeof state.showOnlyChanged === 'boolean') this.showOnlyChanged = state.showOnlyChanged;
                if (state.searchFilter !== undefined) this.searchFilter = state.searchFilter;
                
                // Restore group visibility
                if (state.groupVisibility) {
                    if (typeof state.groupVisibility.untracked === 'boolean') {
                        this.groups.untracked.visible = state.groupVisibility.untracked;
                    }
                    if (typeof state.groupVisibility.unstaged === 'boolean') {
                        this.groups.unstaged.visible = state.groupVisibility.unstaged;
                    }
                    if (typeof state.groupVisibility.staged === 'boolean') {
                        this.groups.staged.visible = state.groupVisibility.staged;
                    }
                }
                
                // File expansions will be restored after diff data loads
                this.savedFileExpansions = state.fileExpansions || {};
                
            } catch (error) {
                console.warn('Failed to load UI state from localStorage:', error);
            }
        },
        
        clearUIState() {
            try {
                localStorage.removeItem(this.getStorageKey());
            } catch (error) {
                console.warn('Failed to clear UI state from localStorage:', error);
            }
        },
        
        getFileExpansionStates() {
            // Start with previously saved expansions to preserve files that are no longer visible
            const expansions = { ...this.savedFileExpansions };
            
            // Update with current file states
            Object.keys(this.groups).forEach(groupKey => {
                this.groups[groupKey].files.forEach(file => {
                    if (file.path && typeof file.expanded === 'boolean') {
                        expansions[file.path] = file.expanded;
                    }
                });
            });
            return expansions;
        },
        
        restoreFileExpansionStates() {
            if (!this.savedFileExpansions) return;
            
            Object.keys(this.groups).forEach(groupKey => {
                this.groups[groupKey].files.forEach(file => {
                    if (file.path && this.savedFileExpansions.hasOwnProperty(file.path)) {
                        file.expanded = this.savedFileExpansions[file.path];
                    }
                });
            });
        },

        // Computed properties
        get visibleGroups() {
            const groups = [];
            
            // Add groups that have content (headers always show, but content may be hidden)
            if (this.groups.untracked.count > 0) {
                groups.push({
                    key: 'untracked',
                    title: 'Untracked',
                    files: this.filterFiles(this.groups.untracked.files),
                    visible: this.groups.untracked.visible,
                    count: this.groups.untracked.count
                });
            }
            
            if (this.groups.unstaged.count > 0) {
                groups.push({
                    key: 'unstaged', 
                    title: 'Unstaged',
                    files: this.filterFiles(this.groups.unstaged.files),
                    visible: this.groups.unstaged.visible,
                    count: this.groups.unstaged.count
                });
            }
            
            if (this.groups.staged.count > 0) {
                groups.push({
                    key: 'staged',
                    title: 'Staged', 
                    files: this.filterFiles(this.groups.staged.files),
                    visible: this.groups.staged.visible,
                    count: this.groups.staged.count
                });
            }
            
            return groups;
        },
        
        get totalVisibleFiles() {
            return this.visibleGroups.reduce((total, group) => 
                total + (group.visible ? group.files.length : 0), 0
            );
        },
        
        get hasAnyGroups() {
            return this.visibleGroups.length > 0;
        },
        
        // Check if all visible files are expanded
        get allExpanded() {
            const allFiles = this.getAllVisibleFiles();
            return allFiles.length > 0 && allFiles.every(file => file.expanded);
        },
        
        // Check if all visible files are collapsed  
        get allCollapsed() {
            const allFiles = this.getAllVisibleFiles();
            return allFiles.length > 0 && allFiles.every(file => !file.expanded);
        },
        
        // Helper methods
        filterFiles(files) {
            let filtered = files.map((file, originalIndex) => ({
                ...file,
                originalIndex // Store the original index for toggleFile to use
            }));
            
            // Filter by search term
            if (this.searchFilter.trim()) {
                const search = this.searchFilter.toLowerCase();
                filtered = filtered.filter(file => 
                    file.path.toLowerCase().includes(search)
                );
            }
            
            // Filter by changed files only
            if (this.showOnlyChanged) {
                filtered = filtered.filter(file => 
                    file.additions > 0 || file.deletions > 0 || file.status === 'untracked' || file.status === 'staged'
                );
            }
            
            return filtered;
        },
        
        getAllVisibleFiles() {
            const allFiles = [];
            this.visibleGroups.forEach(group => {
                if (group.visible) {
                    allFiles.push(...group.files);
                }
            });
            return allFiles;
        },
        
        toggleGroupVisibility(groupKey) {
            this.groups[groupKey].visible = !this.groups[groupKey].visible;
            this.saveUIState();
        },
        
        // Detect language from file extension
        detectLanguage(filePath) {
            const ext = filePath.split('.').pop()?.toLowerCase();
            const languageMap = {
                'js': 'javascript',
                'jsx': 'javascript',
                'ts': 'typescript',
                'tsx': 'typescript',
                'py': 'python',
                'html': 'html',
                'htm': 'html',
                'css': 'css',
                'scss': 'scss',
                'sass': 'sass',
                'less': 'less',
                'json': 'json',
                'xml': 'xml',
                'yaml': 'yaml',
                'yml': 'yaml',
                'md': 'markdown',
                'sh': 'bash',
                'bash': 'bash',
                'zsh': 'bash',
                'php': 'php',
                'rb': 'ruby',
                'go': 'go',
                'rs': 'rust',
                'java': 'java',
                'c': 'c',
                'cpp': 'cpp',
                'cc': 'cpp',
                'cxx': 'cpp',
                'h': 'c',
                'hpp': 'cpp',
                'cs': 'csharp',
                'sql': 'sql',
                'r': 'r',
                'swift': 'swift',
                'kt': 'kotlin',
                'scala': 'scala',
                'clj': 'clojure',
                'ex': 'elixir',
                'exs': 'elixir',
                'dockerfile': 'dockerfile'
            };
            return languageMap[ext] || 'plaintext';
        },
        
        // Apply syntax highlighting to code content
        highlightCode(content, filePath) {
            if (!content || !window.hljs) return content;
            
            try {
                const language = this.detectLanguage(filePath);
                if (language === 'plaintext') {
                    // Try auto-detection for unknown extensions
                    const result = hljs.highlightAuto(content);
                    return result.value;
                } else {
                    // Use detected language
                    const result = hljs.highlight(content, { language });
                    return result.value;
                }
            } catch (error) {
                // If highlighting fails, return original content
                console.warn('Syntax highlighting failed:', error);
                return content;
            }
        },
        
        // Initialize the application
        async init() {
            console.log('🎉 Difflicious initialized');
            await this.loadBranches(); // Load branches first
            await this.loadGitStatus();
            this.loadUIState(); // Load saved UI state after we have repository name
            await this.loadDiffs();
        },

        // Load branch data from API
        async loadBranches() {
            try {
                const response = await fetch('/api/branches');
                const data = await response.json();
                if (data.status === 'ok') {
                    this.branches = data.branches;
                    // Set baseBranch to default if available, otherwise current
                    this.baseBranch = this.branches.default || this.branches.current;
                }
            } catch (error) {
                console.error('Failed to load branches:', error);
            }
        },
        
        // Load git status from API
        async loadGitStatus() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                
                if (data.status === 'ok') {
                    this.gitStatus = {
                        current_branch: data.current_branch || 'unknown',
                        repository_name: data.repository_name || 'unknown',
                        files_changed: data.files_changed || 0,
                        git_available: data.git_available || false
                    };
                }
            } catch (error) {
                console.error('Failed to load git status:', error);
                this.gitStatus = {
                    current_branch: 'error',
                    repository_name: 'error',
                    files_changed: 0,
                    git_available: false
                };
            }
        },
        
        // Load diff data from API
        async loadDiffs() {
            this.loading = true;
            
            try {
                // Build query parameters based on UI state
                const params = new URLSearchParams();
                
                // Handle branch selection
                if (this.baseBranch && this.baseBranch !== 'main') {
                    params.set('base_commit', this.baseBranch);
                }
                
                // Handle unstaged/untracked options
                params.set('unstaged', this.unstaged.toString());
                params.set('untracked', this.untracked.toString());
                
                // Add other filters
                if (this.searchFilter.trim()) {
                    params.set('file', this.searchFilter.trim());
                }
                
                const queryString = params.toString();
                const url = queryString ? `/api/diff?${queryString}` : '/api/diff';
                
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.status === 'ok') {
                    // Update groups with new data
                    const groups = data.groups || {};
                    
                    Object.keys(this.groups).forEach(groupKey => {
                        const groupData = groups[groupKey] || {files: [], count: 0};
                        this.groups[groupKey].files = (groupData.files || []).map(file => ({
                            ...file,
                            expanded: true // Add UI state for each file - start expanded
                        }));
                        this.groups[groupKey].count = groupData.count || 0;
                        // Keep existing visibility state
                    });
                    
                    // Restore file expansion states from localStorage
                    this.restoreFileExpansionStates();
                }
            } catch (error) {
                console.error('Failed to load diffs:', error);
                // Reset all groups to empty on error
                Object.keys(this.groups).forEach(groupKey => {
                    this.groups[groupKey].files = [];
                    this.groups[groupKey].count = 0;
                });
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
        
        // Toggle file expansion
        toggleFile(groupKey, fileIndex) {
            if (this.groups[groupKey] && this.groups[groupKey].files[fileIndex]) {
                this.groups[groupKey].files[fileIndex].expanded = !this.groups[groupKey].files[fileIndex].expanded;
                this.saveUIState();
            }
        },
        
        // Expand all files across all groups
        expandAll() {
            Object.keys(this.groups).forEach(groupKey => {
                this.groups[groupKey].files.forEach(file => {
                    file.expanded = true;
                });
            });
            this.saveUIState();
        },
        
        // Collapse all files across all groups
        collapseAll() {
            Object.keys(this.groups).forEach(groupKey => {
                this.groups[groupKey].files.forEach(file => {
                    file.expanded = false;
                });
            });
            this.saveUIState();
        },
        
        // Navigate to previous file
        navigateToPreviousFile(groupKey, fileIndex) {
            const allFiles = this.getAllVisibleFiles();
            const currentGlobalIndex = this.getGlobalFileIndex(groupKey, fileIndex);
            
            if (currentGlobalIndex > 0) {
                const previousFileId = `file-${currentGlobalIndex - 1}`;
                document.getElementById(previousFileId)?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        },
        
        // Navigate to next file
        navigateToNextFile(groupKey, fileIndex) {
            const allFiles = this.getAllVisibleFiles();
            const currentGlobalIndex = this.getGlobalFileIndex(groupKey, fileIndex);
            
            if (currentGlobalIndex < allFiles.length - 1) {
                const nextFileId = `file-${currentGlobalIndex + 1}`;
                document.getElementById(nextFileId)?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        },
        
        // Get global index of a file across all groups (for navigation - only visible groups)
        getGlobalFileIndex(targetGroupKey, targetFileIndex) {
            let globalIndex = 0;
            
            for (const group of this.visibleGroups) {
                if (!group.visible) continue;
                
                if (group.key === targetGroupKey) {
                    return globalIndex + targetFileIndex;
                }
                globalIndex += group.files.length;
            }
            
            return -1;
        },
        
        // Get unique file ID across all groups (for DOM IDs - includes all groups)
        getFileId(targetGroupKey, targetFileIndex) {
            let fileId = 0;
            
            for (const group of this.visibleGroups) {
                if (group.key === targetGroupKey) {
                    return fileId + targetFileIndex;
                }
                fileId += group.files.length;
            }
            
            return fileId;
        }
    };
}
