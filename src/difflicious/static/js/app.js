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
        
        // Context expansion state tracking
        contextExpansions: {}, // { filePath: { hunkIndex: { beforeExpanded: number, afterExpanded: number } } }
        contextLoading: {}, // { filePath: { hunkIndex: { before: bool, after: bool } } }
        fileMetadata: {}, // { filePath: { lineCount: number } }
        
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
                fileExpansions: this.getFileExpansionStates(),
                
                // Context expansion states
                contextExpansions: this.contextExpansions
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
                
                // Restore file expansion states
                this.savedFileExpansions = state.fileExpansions || {};
                
                // Restore context expansion states
                this.contextExpansions = state.contextExpansions || {};
                if (this.savedFileExpansions) {
                    Object.keys(this.groups).forEach(groupKey => {
                        this.groups[groupKey].files.forEach(file => {
                            if (file.path && this.savedFileExpansions.hasOwnProperty(file.path)) {
                                file.expanded = this.savedFileExpansions[file.path];
                            }
                        });
                    });
                }
                
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
        

        // Computed properties
        get visibleGroups() {
            const groups = [];
            
            // Special case: if only staged changes are displayed, show files without grouping
            const showingStagedOnly = !this.unstaged && !this.untracked;
            
            // Add groups that have content (headers always show, but content may be hidden)
            if (this.groups.untracked.count > 0) {
                groups.push({
                    key: 'untracked',
                    title: 'Untracked',
                    files: this.filterFiles(this.groups.untracked.files),
                    visible: this.groups.untracked.visible,
                    count: this.groups.untracked.count,
                    hideGroupHeader: false
                });
            }
            
            if (this.groups.unstaged.count > 0) {
                groups.push({
                    key: 'unstaged', 
                    title: 'Unstaged',
                    files: this.filterFiles(this.groups.unstaged.files),
                    visible: this.groups.unstaged.visible,
                    count: this.groups.unstaged.count,
                    hideGroupHeader: false
                });
            }
            
            if (this.groups.staged.count > 0) {
                groups.push({
                    key: 'staged',
                    title: 'Staged', 
                    files: this.filterFiles(this.groups.staged.files),
                    visible: this.groups.staged.visible,
                    count: this.groups.staged.count,
                    hideGroupHeader: showingStagedOnly
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
            
            // Save current UI state before fetching new diff data
            this.saveUIState();
            
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
                    
                    // Load UI state after processing new diff data (includes file expansion restoration)
                    this.loadUIState();
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
            const totalFiles = this.getTotalVisibleFiles();
            const currentGlobalIndex = this.getGlobalFileIndex(groupKey, fileIndex);
            
            if (currentGlobalIndex < totalFiles - 1) {
                const nextFileId = `file-${currentGlobalIndex + 1}`;
                document.getElementById(nextFileId)?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        },
        
        // Get total count of visible files across all visible groups
        getTotalVisibleFiles() {
            let total = 0;
            for (const group of this.visibleGroups) {
                if (group.visible) {
                    total += group.files.length;
                }
            }
            return total;
        },
        
        // Get global index of a file across all groups (for navigation)
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
        
        // Get unique file ID for DOM (same as global index for consistency)
        getFileId(targetGroupKey, targetFileIndex) {
            return this.getGlobalFileIndex(targetGroupKey, targetFileIndex);
        },
        
        // Context expansion methods
        async expandContext(filePath, hunkIndex, direction, contextLines = 10) {
            console.log('🔵 expandContext called:', { filePath, hunkIndex, direction, contextLines });
            // Initialize context state if not exists
            if (!this.contextExpansions[filePath]) {
                this.contextExpansions[filePath] = {};
            }
            if (!this.contextExpansions[filePath][hunkIndex]) {
                this.contextExpansions[filePath][hunkIndex] = { beforeExpanded: 0, afterExpanded: 0 };
            }
            if (!this.contextLoading[filePath]) {
                this.contextLoading[filePath] = {};
            }
            if (!this.contextLoading[filePath][hunkIndex]) {
                this.contextLoading[filePath][hunkIndex] = { before: false, after: false };
            }

            // Set loading state
            this.contextLoading[filePath][hunkIndex][direction] = true;

            try {
                // Calculate total context needed (default 3 + already expanded + new expansion)
                const currentlyExpanded = this.contextExpansions[filePath][hunkIndex][direction + 'Expanded'] || 0;
                const totalContextNeeded = 3 + currentlyExpanded + contextLines;
                
                const response = await this.fetchContextLines(filePath, totalContextNeeded);
                if (response && response.status === 'ok' && response.file) {
                    await this.mergeExtendedContext(filePath, hunkIndex, direction, response.file, contextLines);
                    this.contextExpansions[filePath][hunkIndex][direction + 'Expanded'] += contextLines;
                    // Save state after successful expansion
                    this.saveUIState();
                }
            } catch (error) {
                console.error('Failed to expand context:', error);
            } finally {
                // Clear loading state
                this.contextLoading[filePath][hunkIndex][direction] = false;
            }
        },

        async fetchContextLines(filePath, totalContextLines) {
            const params = new URLSearchParams();
            params.set('file_path', filePath);
            params.set('context_lines', totalContextLines.toString());
            
            // Add current diff parameters to maintain consistency
            if (this.baseBranch && this.baseBranch !== 'main') {
                params.set('base_commit', this.baseBranch);
            }

            const url = `/api/diff/context?${params.toString()}`;
            const response = await fetch(url);
            return await response.json();
        },

        async mergeExtendedContext(filePath, hunkIndex, direction, extendedFileData, contextLines) {
            // Store file metadata if available
            if (extendedFileData.file_line_count) {
                this.fileMetadata[filePath] = {
                    lineCount: extendedFileData.file_line_count
                };
            }

            // Find the file in our current data structure
            let targetFile = null;
            for (const groupKey of Object.keys(this.groups)) {
                const file = this.groups[groupKey].files.find(f => f.path === filePath);
                if (file) {
                    targetFile = file;
                    break;
                }
            }

            if (!targetFile || !targetFile.hunks || !targetFile.hunks[hunkIndex]) {
                console.warn('Target file or hunk not found for context expansion');
                return;
            }

            if (!extendedFileData.hunks || !extendedFileData.hunks[hunkIndex]) {
                console.warn('Extended file data missing expected hunk');
                return;
            }

            const currentHunk = targetFile.hunks[hunkIndex];
            const extendedHunk = extendedFileData.hunks[hunkIndex];

            // Replace the entire hunk with extended version
            // This approach works for progressive expansion by always using the latest extended context
            if (extendedHunk.lines && extendedHunk.lines.length > 0) {
                currentHunk.lines = extendedHunk.lines;
                currentHunk.old_count = extendedHunk.old_count;
                currentHunk.new_count = extendedHunk.new_count;
                currentHunk.old_start = extendedHunk.old_start;
                currentHunk.new_start = extendedHunk.new_start;
            }
        },

        // Check if context can be expanded for a hunk
        canExpandContext(filePath, hunkIndex, direction) {
            // Find the file and hunk to check boundaries
            let targetFile = null;
            for (const groupKey of Object.keys(this.groups)) {
                const file = this.groups[groupKey].files.find(f => f.path === filePath);
                if (file) {
                    targetFile = file;
                    break;
                }
            }

            if (!targetFile || !targetFile.hunks || !targetFile.hunks[hunkIndex]) {
                return false;
            }

            const hunk = targetFile.hunks[hunkIndex];
            
            // Check file boundaries
            if (direction === 'before') {
                // Can't expand before if we're already at line 1
                return hunk.old_start > 1;
            } else if (direction === 'after') {
                // Check if we're near the end of the file
                if (this.fileMetadata[filePath] && this.fileMetadata[filePath].lineCount) {
                    const fileLineCount = this.fileMetadata[filePath].lineCount;
                    const hunkEndLine = hunk.old_start + hunk.old_count - 1;
                    
                    // Don't show "show more after" if we're within 10 lines of the end of file
                    return hunkEndLine < fileLineCount - 10;
                } else {
                    // No file metadata, allow expansion (will be determined by backend)
                    return true;
                }
            }

            // Check expansion limits (max 50 lines in each direction)
            const maxExpansion = 50;
            if (!this.contextExpansions[filePath] || !this.contextExpansions[filePath][hunkIndex]) {
                return true;
            }
            const expanded = this.contextExpansions[filePath][hunkIndex][direction + 'Expanded'] || 0;
            return expanded < maxExpansion;
        },

        // Check if context is currently loading
        isContextLoading(filePath, hunkIndex, direction) {
            // Return false if loading state is not set up yet (undefined means not loading)
            return !!(this.contextLoading[filePath] && 
                     this.contextLoading[filePath][hunkIndex] && 
                     this.contextLoading[filePath][hunkIndex][direction]);
        }
    };
}
// Test line added to create a diff
// Another test change for debugging context expansion
