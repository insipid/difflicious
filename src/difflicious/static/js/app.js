/**
 * Difflicious Alpine.js Application
 * Main application logic for git diff visualization
 */

function diffliciousApp() { // eslint-disable-line no-unused-vars
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
            untracked: { files: [], count: 0, visible: true },
            unstaged: { files: [], count: 0, visible: true },
            staged: { files: [], count: 0, visible: true }
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

                // Note: contextExpansions are NOT persisted - they should start fresh each session
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

                // Note: contextExpansions are NOT restored - they start fresh each session
                if (this.savedFileExpansions) {
                    Object.keys(this.groups).forEach(groupKey => {
                        this.groups[groupKey].files.forEach(file => {
                            if (file.path && Object.prototype.hasOwnProperty.call(this.savedFileExpansions, file.path)) {
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

                // Handle comparison mode selection
                if (this.baseBranch) {
                    // Determine comparison mode based on base_ref
                    const isHeadComparison = this.baseBranch === 'HEAD' || this.baseBranch === this.branches.current;
                    params.set('use_head', isHeadComparison.toString());
                    params.set('base_ref', this.baseBranch);
                    params.set('base_commit', this.baseBranch); // legacy compat
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
                        const groupData = groups[groupKey] || { files: [], count: 0 };
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
            // Find the target file to determine which hunk to actually expand
            let targetFile = null;
            for (const groupKey of Object.keys(this.groups)) {
                const file = this.groups[groupKey].files.find(f => f.path === filePath);
                if (file) {
                    targetFile = file;
                    break;
                }
            }

            if (!targetFile || !targetFile.hunks) {
                console.error('Target file not found');
                return;
            }

            let targetHunkIndex, targetDirection;

            if (direction === 'before') {
                // "Expand up" - expand the "before" context of the CURRENT hunk
                targetHunkIndex = hunkIndex;
                targetDirection = 'before';
            } else { // direction === 'after'
                // "Expand down" - expand the "after" context of the PREVIOUS hunk
                targetHunkIndex = hunkIndex - 1;
                targetDirection = 'after';
            }

            // Validate target hunk exists
            if (!targetFile.hunks[targetHunkIndex]) {
                console.error('Target hunk not found');
                return;
            }

            // Initialize context state for target hunk
            if (!this.contextExpansions[filePath]) {
                this.contextExpansions[filePath] = {};
            }
            if (!this.contextExpansions[filePath][targetHunkIndex]) {
                this.contextExpansions[filePath][targetHunkIndex] = { beforeExpanded: 0, afterExpanded: 0 };
            }
            if (!this.contextLoading[filePath]) {
                this.contextLoading[filePath] = {};
            }
            if (!this.contextLoading[filePath][targetHunkIndex]) {
                this.contextLoading[filePath][targetHunkIndex] = { before: false, after: false };
            }

            // Set loading state for target hunk
            this.contextLoading[filePath][targetHunkIndex][targetDirection] = true;

            try {
                const targetHunk = targetFile.hunks[targetHunkIndex];
                let startLine, endLine;

                if (targetDirection === 'before') {
                    // Get lines before the target hunk
                    endLine = targetHunk.new_start - 1;
                    startLine = Math.max(1, endLine - contextLines + 1);
                } else { // targetDirection === 'after'
                    // Get lines after the target hunk
                    startLine = targetHunk.new_start + targetHunk.new_count;
                    endLine = startLine + contextLines - 1;
                }

                const response = await this.fetchFileLines(filePath, startLine, endLine);
                if (response && response.status === 'ok' && response.lines) {
                    this.insertContextLines(filePath, targetHunkIndex, targetDirection, response.lines, startLine);
                    this.contextExpansions[filePath][targetHunkIndex][targetDirection + 'Expanded'] += response.lines.length;
                    // Save state after successful expansion
                    this.saveUIState();
                }
            } catch (error) {
                console.error('Failed to expand context:', error);
            } finally {
                // Clear loading state for target hunk
                this.contextLoading[filePath][targetHunkIndex][targetDirection] = false;
            }
        },

        async fetchFileLines(filePath, startLine, endLine) {
            const params = new URLSearchParams();
            params.set('file_path', filePath);
            params.set('start_line', startLine.toString());
            params.set('end_line', endLine.toString());

            const url = `/api/file/lines?${params.toString()}`;
            const response = await fetch(url);
            return await response.json();
        },

        insertContextLines(filePath, hunkIndex, direction, lines, startLineNum) {
            // Find the target file and hunk
            let targetFile = null;
            for (const groupKey of Object.keys(this.groups)) {
                const file = this.groups[groupKey].files.find(f => f.path === filePath);
                if (file) {
                    targetFile = file;
                    break;
                }
            }

            if (!targetFile || !targetFile.hunks || !targetFile.hunks[hunkIndex]) {
                console.warn('Target file or hunk not found for context insertion');
                return;
            }

            const currentHunk = targetFile.hunks[hunkIndex];

            // Convert the raw lines into diff line format
            let newDiffLines;

            if (direction === 'after') {
                // Special case: expanding down (extending previous hunk's after context)
                // Both sides continue sequentially from where the hunk ended
                const leftStartLineNum = currentHunk.old_start + currentHunk.old_count;
                const rightStartLineNum = currentHunk.new_start + currentHunk.new_count;

                newDiffLines = lines.map((content, index) => {
                    return {
                        type: 'context',
                        left: {
                            content,
                            line_num: leftStartLineNum + index
                        },
                        right: {
                            content,
                            line_num: rightStartLineNum + index
                        }
                    };
                });
            } else {
                // Expanding before: calculate separate line numbers for left and right sides
                const leftStartLineNum = currentHunk.old_start - lines.length;
                const rightStartLineNum = currentHunk.new_start - lines.length;

                newDiffLines = lines.map((content, index) => {
                    return {
                        type: 'context',
                        left: {
                            content,
                            line_num: leftStartLineNum + index
                        },
                        right: {
                            content,
                            line_num: rightStartLineNum + index
                        }
                    };
                });
            }

            if (direction === 'before') {
                // Insert at the beginning of the hunk
                currentHunk.lines = [...newDiffLines, ...currentHunk.lines];
                // Update hunk start positions
                currentHunk.old_start = Math.max(1, currentHunk.old_start - lines.length);
                currentHunk.new_start = Math.max(1, currentHunk.new_start - lines.length);
            } else { // direction === 'after'
                // Insert at the end of the hunk
                currentHunk.lines = [...currentHunk.lines, ...newDiffLines];
            }

            // Update hunk counts
            currentHunk.old_count += lines.length;
            currentHunk.new_count += lines.length;

            // Check if we need to merge hunks after expansion
            if (direction === 'after') {
                this.checkAndMergeHunks(targetFile, hunkIndex);
            } else if (direction === 'before') {
                // When expanding up, check if we can merge with the previous hunk
                this.checkAndMergeHunksReverse(targetFile, hunkIndex);
            }
        },

        checkAndMergeHunks(targetFile, currentHunkIndex) {
            const nextHunkIndex = currentHunkIndex + 1;

            // Check if there's a next hunk to potentially merge with
            if (nextHunkIndex >= targetFile.hunks.length) {
                return;
            }

            const currentHunk = targetFile.hunks[currentHunkIndex];
            const nextHunk = targetFile.hunks[nextHunkIndex];

            console.log('🟡 Current hunk:', currentHunk);
            console.log('🟡 Next hunk:', nextHunk);

            // Calculate where current hunk ends and next hunk starts
            const currentOldEnd = currentHunk.old_start + currentHunk.old_count - 1; // Last line of current hunk
            const currentNewEnd = currentHunk.new_start + currentHunk.new_count - 1; // Last line of current hunk

            // Check if hunks are now adjacent or overlapping
            const oldGap = nextHunk.old_start - currentOldEnd - 1; // Gap between last line of current and first line of next
            const newGap = nextHunk.new_start - currentNewEnd - 1;

            console.log('🟡 Old gap, new gap:', oldGap, newGap);

            // Merge if hunks are adjacent or overlapping (gap <= 1, meaning at most 1 line between them)
            if (oldGap <= 1 && newGap <= 1) {
                // If there's a gap of 1 line, add context lines to bridge it
                if (oldGap === 1 && newGap === 1) {
                    // Add the single bridging line as context
                    const bridgeLine = {
                        type: 'context',
                        left: {
                            content: '', // Empty placeholder for the bridging line
                            line_num: currentOldEnd + 1
                        },
                        right: {
                            content: '',
                            line_num: currentNewEnd + 1
                        }
                    };
                    currentHunk.lines.push(bridgeLine);
                    currentHunk.old_count += 1;
                    currentHunk.new_count += 1;
                }

                // Merge the hunks with deduplication
                // Find overlapping lines by comparing line numbers
                const currentLastLeftLine = currentHunk.lines[currentHunk.lines.length - 1]?.left?.line_num || 0;
                const currentLastRightLine = currentHunk.lines[currentHunk.lines.length - 1]?.right?.line_num || 0;

                // Filter out duplicate lines
                const uniqueNextLines = nextHunk.lines.filter(line => {
                    const leftLineNum = line.left?.line_num || 0;
                    const rightLineNum = line.right?.line_num || 0;
                    return leftLineNum > currentLastLeftLine || rightLineNum > currentLastRightLine;
                });

                currentHunk.lines = [...currentHunk.lines, ...uniqueNextLines];
                currentHunk.old_count = nextHunk.old_start + nextHunk.old_count - currentHunk.old_start;
                currentHunk.new_count = nextHunk.new_start + nextHunk.new_count - currentHunk.new_start;

                // Update section header to combine both if they exist
                if (currentHunk.section_header && nextHunk.section_header) {
                    currentHunk.section_header = `${currentHunk.section_header} / ${nextHunk.section_header}`;
                } else if (nextHunk.section_header) {
                    currentHunk.section_header = nextHunk.section_header;
                }

                // Remove the next hunk from the array
                targetFile.hunks.splice(nextHunkIndex, 1);
            }
        },

        checkAndMergeHunksReverse(targetFile, currentHunkIndex) {
            const previousHunkIndex = currentHunkIndex - 1;

            // Check if there's a previous hunk to potentially merge with
            if (previousHunkIndex < 0) {
                return;
            }

            const currentHunk = targetFile.hunks[currentHunkIndex];
            const previousHunk = targetFile.hunks[previousHunkIndex];

            // Calculate where previous hunk ends and current hunk starts
            const previousOldEnd = previousHunk.old_start + previousHunk.old_count - 1;
            const previousNewEnd = previousHunk.new_start + previousHunk.new_count - 1;

            // Check if hunks are now adjacent or overlapping
            const oldGap = currentHunk.old_start - previousOldEnd - 1;
            const newGap = currentHunk.new_start - previousNewEnd - 1;

            // Merge if hunks are adjacent or overlapping (gap <= 1, meaning at most 1 line between them)
            if (oldGap <= 1 && newGap <= 1) {
                // If there's a gap of 1 line, add context lines to bridge it
                if (oldGap === 1 && newGap === 1) {
                    // Add the single bridging line as context
                    const bridgeLine = {
                        type: 'context',
                        left: {
                            content: '', // Empty placeholder for the bridging line
                            line_num: previousOldEnd + 1
                        },
                        right: {
                            content: '',
                            line_num: previousNewEnd + 1
                        }
                    };
                    previousHunk.lines.push(bridgeLine);
                    previousHunk.old_count += 1;
                    previousHunk.new_count += 1;
                }

                // Find overlapping lines by comparing line numbers
                const previousLastLeftLine = previousHunk.lines[previousHunk.lines.length - 1]?.left?.line_num || 0;
                const previousLastRightLine = previousHunk.lines[previousHunk.lines.length - 1]?.right?.line_num || 0;

                // Filter out duplicate lines
                const uniqueCurrentLines = currentHunk.lines.filter(line => {
                    const leftLineNum = line.left?.line_num || 0;
                    const rightLineNum = line.right?.line_num || 0;
                    return leftLineNum > previousLastLeftLine || rightLineNum > previousLastRightLine;
                });

                previousHunk.lines = [...previousHunk.lines, ...uniqueCurrentLines];
                previousHunk.old_count = currentHunk.old_start + currentHunk.old_count - previousHunk.old_start;
                previousHunk.new_count = currentHunk.new_start + currentHunk.new_count - previousHunk.new_start;

                // Update section header to combine both if they exist
                if (previousHunk.section_header && currentHunk.section_header) {
                    previousHunk.section_header = `${previousHunk.section_header} / ${currentHunk.section_header}`;
                } else if (currentHunk.section_header) {
                    previousHunk.section_header = currentHunk.section_header;
                }

                // Remove the current hunk from the array
                targetFile.hunks.splice(currentHunkIndex, 1);
            }
        },

        // Check if context can be expanded for a hunk
        canExpandContext(filePath, hunkIndex, direction) {
            // Find the file to get all hunks
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

            const hunks = targetFile.hunks;

            if (direction === 'before') {
                // "Expand up" button visibility:
                if (hunkIndex === 0) {
                    // First hunk: show if it doesn't start at line 1
                    return hunks[0].old_start > 1;
                } else {
                    // All other hunks: always show (expands before context of current hunk)
                    return true;
                }
            } else if (direction === 'after') {
                // "Expand down" button visibility:
                if (hunkIndex === 0) {
                    // First hunk: never show "Expand down"
                    return false;
                } else {
                    // All other hunks: always show (expands after context of previous hunk)
                    return true;
                }
            }

            return false;
        },

        // Check if context is currently loading
        isContextLoading(filePath, hunkIndex, direction) {
            // Return false if loading state is not set up yet (undefined means not loading)
            return !!(this.contextLoading[filePath] &&
                this.contextLoading[filePath][hunkIndex] &&
                this.contextLoading[filePath][hunkIndex][direction]);
        },

        // Bottom expand functionality
        shouldShowBottomExpand(file) {
            // Only show if file has line_count and hunks
            if (!file.line_count || !file.hunks || file.hunks.length === 0) {
                return false;
            }

            // Find the last line number from the last hunk
            const lastHunk = file.hunks[file.hunks.length - 1];
            if (!lastHunk.lines || lastHunk.lines.length === 0) {
                return false;
            }

            let lastRightLineNum = 0;
            // Look through lines in reverse to find the last line number
            for (let i = lastHunk.lines.length - 1; i >= 0; i--) {
                const line = lastHunk.lines[i];
                if (line.type === 'context' || line.type === 'change') {
                    if (line.right && line.right.line_num) {
                        lastRightLineNum = line.right.line_num;
                        break;
                    }
                }
            }

            // Show button if file has more lines beyond the last shown line
            return file.line_count > lastRightLineNum;
        },

        getRemainingLines(file) {
            if (!file.line_count || !file.hunks || file.hunks.length === 0) {
                return 0;
            }

            // Find the last line number from the last hunk
            const lastHunk = file.hunks[file.hunks.length - 1];
            if (!lastHunk.lines || lastHunk.lines.length === 0) {
                return 0;
            }

            let lastRightLineNum = 0;
            // Look through lines in reverse to find the last line number
            for (let i = lastHunk.lines.length - 1; i >= 0; i--) {
                const line = lastHunk.lines[i];
                if (line.type === 'context' || line.type === 'change') {
                    if (line.right && line.right.line_num) {
                        lastRightLineNum = line.right.line_num;
                        break;
                    }
                }
            }

            return file.line_count - lastRightLineNum;
        },

        async expandBottomContext(filePath, contextLines = 10) {
            // Find the target file
            let targetFile = null;
            for (const groupKey of Object.keys(this.groups)) {
                const file = this.groups[groupKey].files.find(f => f.path === filePath);
                if (file) {
                    targetFile = file;
                    break;
                }
            }

            if (!targetFile || !targetFile.hunks || targetFile.hunks.length === 0) {
                console.error('Target file not found or has no hunks');
                return;
            }

            // Set loading state
            this.setBottomContextLoading(filePath, true);

            try {
                // For bottom expand, we need to expand after the last hunk
                // But expandContext with direction='after' targets hunkIndex-1
                // So we need to pass lastHunkIndex+1 to target the last hunk
                const lastHunkIndex = targetFile.hunks.length - 1;
                await this.expandContext(filePath, lastHunkIndex + 1, 'after', contextLines);
            } catch (error) {
                console.error('Failed to expand bottom context:', error);
            } finally {
                // Clear loading state
                this.setBottomContextLoading(filePath, false);
            }
        },

        isBottomContextLoading(filePath) {
            return !!(this.bottomContextLoading && this.bottomContextLoading[filePath]);
        },

        setBottomContextLoading(filePath, loading) {
            if (!this.bottomContextLoading) {
                this.bottomContextLoading = {};
            }
            if (loading) {
                this.bottomContextLoading[filePath] = true;
            } else {
                delete this.bottomContextLoading[filePath];
            }
        }
    };
}
