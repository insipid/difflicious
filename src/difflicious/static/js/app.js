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
        branches: {
            all: [],
            current: '',
            main: '',
            others: []
        },
        
        // UI state
        showOnlyChanged: true,
        searchFilter: '',
        
        // Branch and diff options
        baseBranch: 'main',
        targetBranch: 'working-directory',
        stageShowing: true,
        attractQuestion: false,
        
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
            await this.loadDiffs();
        },

        // Load branch data from API
        async loadBranches() {
            try {
                const response = await fetch('/api/branches');
                const data = await response.json();
                if (data.status === 'ok') {
                    this.branches = data.branches;
                    // Set baseBranch to main if available, otherwise current
                    this.baseBranch = this.branches.main || this.branches.current;
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
                // Build query parameters based on UI state
                const params = new URLSearchParams();
                
                // Handle branch selection
                if (this.baseBranch && this.baseBranch !== 'main') {
                    params.set('base_commit', this.baseBranch);
                }
                
                if (this.targetBranch && this.targetBranch !== 'working-directory') {
                    params.set('target_commit', this.targetBranch);
                }
                
                // Handle staging options
                if (this.stageShowing) {
                    params.set('staged', 'true');
                }
                
                // Add other filters
                if (this.searchFilter.trim()) {
                    params.set('file', this.searchFilter.trim());
                }
                
                const queryString = params.toString();
                const url = queryString ? `/api/diff?${queryString}` : '/api/diff';
                
                const response = await fetch(url);
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
        },
        
        // Navigate to previous file
        navigateToPreviousFile(currentIndex) {
            if (currentIndex > 0) {
                const previousFileId = `file-${currentIndex - 1}`;
                document.getElementById(previousFileId)?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        },
        
        // Navigate to next file
        navigateToNextFile(currentIndex) {
            if (currentIndex < this.filteredDiffs.length - 1) {
                const nextFileId = `file-${currentIndex + 1}`;
                document.getElementById(nextFileId)?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }
    };
}
