/**
 * Minimal JavaScript for diff interactions
 * Replaces Alpine.js with lightweight vanilla JS
 */

// DOM manipulation utilities
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// State management
const DiffState = {
    expandedFiles: new Set(),
    expandedGroups: new Set(['untracked', 'unstaged', 'staged']),
    
    init() {
        this.bindEventListeners();
        this.restoreState();
    },
    
    bindEventListeners() {
        // Global expand/collapse buttons
        const expandAllBtn = $('#expandAll');
        const collapseAllBtn = $('#collapseAll');
        
        if (expandAllBtn) expandAllBtn.addEventListener('click', () => this.expandAllFiles());
        if (collapseAllBtn) collapseAllBtn.addEventListener('click', () => this.collapseAllFiles());
        
        // Form auto-submit on changes
        $$('input[type="checkbox"], select').forEach(input => {
            input.addEventListener('change', () => {
                input.closest('form')?.submit();
            });
        });
    },
    
    restoreState() {
        // Restore from localStorage if available
        const saved = localStorage.getItem('difflicious-state');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                this.expandedFiles = new Set(state.expandedFiles || []);
                this.expandedGroups = new Set(state.expandedGroups || ['untracked', 'unstaged', 'staged']);
            } catch (e) {
                console.warn('Failed to restore state:', e);
            }
        }
    },
    
    saveState() {
        const state = {
            expandedFiles: Array.from(this.expandedFiles),
            expandedGroups: Array.from(this.expandedGroups)
        };
        localStorage.setItem('difflicious-state', JSON.stringify(state));
    }
};

// File operations
function toggleFile(filePath) {
    const fileElement = $(`[data-file="${filePath}"]`);
    const contentElement = $(`[data-file-content="${filePath}"]`);
    const toggleIcon = fileElement?.querySelector('.toggle-icon');
    
    if (!fileElement || !contentElement || !toggleIcon) return;
    
    const isExpanded = DiffState.expandedFiles.has(filePath);
    
    if (isExpanded) {
        // Collapse
        contentElement.style.display = 'none';
        toggleIcon.textContent = '▶';
        toggleIcon.dataset.expanded = 'false';
        DiffState.expandedFiles.delete(filePath);
    } else {
        // Expand
        contentElement.style.display = 'block';
        toggleIcon.textContent = '▼';
        toggleIcon.dataset.expanded = 'true';
        DiffState.expandedFiles.add(filePath);
    }
    
    DiffState.saveState();
}

function toggleGroup(groupKey) {
    const groupElement = $(`[data-group="${groupKey}"]`);
    const contentElement = $(`[data-group-content="${groupKey}"]`);
    const toggleIcon = groupElement?.querySelector('.toggle-icon');
    
    if (!groupElement || !contentElement || !toggleIcon) return;
    
    const isExpanded = DiffState.expandedGroups.has(groupKey);
    
    if (isExpanded) {
        // Collapse
        contentElement.style.display = 'none';
        toggleIcon.textContent = '▶';
        toggleIcon.dataset.expanded = 'false';
        DiffState.expandedGroups.delete(groupKey);
    } else {
        // Expand
        contentElement.style.display = 'block';
        toggleIcon.textContent = '▼';
        toggleIcon.dataset.expanded = 'true';
        DiffState.expandedGroups.add(groupKey);
    }
    
    DiffState.saveState();
}

function expandAllFiles() {
    $$('[data-file]').forEach(fileElement => {
        const filePath = fileElement.dataset.file;
        if (filePath && !DiffState.expandedFiles.has(filePath)) {
            toggleFile(filePath);
        }
    });
}

function collapseAllFiles() {
    $$('[data-file]').forEach(fileElement => {
        const filePath = fileElement.dataset.file;
        if (filePath && DiffState.expandedFiles.has(filePath)) {
            toggleFile(filePath);
        }
    });
}

// Navigation
function navigateToPreviousFile(currentFilePath) {
    const allFiles = Array.from($$('[data-file]'));
    const currentIndex = allFiles.findIndex(el => el.dataset.file === currentFilePath);
    
    if (currentIndex > 0) {
        const prevFile = allFiles[currentIndex - 1];
        prevFile.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function navigateToNextFile(currentFilePath) {
    const allFiles = Array.from($$('[data-file]'));
    const currentIndex = allFiles.findIndex(el => el.dataset.file === currentFilePath);
    
    if (currentIndex >= 0 && currentIndex < allFiles.length - 1) {
        const nextFile = allFiles[currentIndex + 1];
        nextFile.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Context expansion
async function expandContext(filePath, hunkIndex, direction, contextLines = 10) {
    const button = event.target;
    const originalText = button.textContent;
    
    // Show loading state
    button.textContent = '...';
    button.disabled = true;
    
    try {
        const params = new URLSearchParams({
            file_path: filePath,
            hunk_index: hunkIndex,
            direction: direction,
            context_lines: contextLines
        });
        
        const response = await fetch(`/api/expand-context?${params}`);
        const result = await response.json();
        
        if (result.status === 'ok') {
            // Reload the page to show expanded context
            // In a more sophisticated implementation, this could update the DOM directly
            window.location.reload();
        } else {
            console.error('Context expansion failed:', result.message);
        }
        
    } catch (error) {
        console.error('Context expansion error:', error);
    } finally {
        // Restore button state
        button.textContent = originalText;
        button.disabled = false;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    DiffState.init();
    
    // Apply initial state
    setTimeout(() => {
        // Show/hide content based on saved state
        DiffState.expandedFiles.forEach(filePath => {
            const contentElement = $(`[data-file-content="${filePath}"]`);
            const toggleIcon = $(`[data-file="${filePath}"] .toggle-icon`);
            if (contentElement && toggleIcon) {
                contentElement.style.display = 'block';
                toggleIcon.textContent = '▼';
                toggleIcon.dataset.expanded = 'true';
            }
        });
        
        DiffState.expandedGroups.forEach(groupKey => {
            const contentElement = $(`[data-group-content="${groupKey}"]`);
            const toggleIcon = $(`[data-group="${groupKey}"] .toggle-icon`);
            if (contentElement && toggleIcon) {
                contentElement.style.display = 'block';
                toggleIcon.textContent = '▼';
                toggleIcon.dataset.expanded = 'true';
            }
        });
    }, 100);
});

// Global functions for HTML onclick handlers
window.toggleFile = toggleFile;
window.toggleGroup = toggleGroup;
window.expandAllFiles = expandAllFiles;
window.collapseAllFiles = collapseAllFiles;
window.navigateToPreviousFile = navigateToPreviousFile;
window.navigateToNextFile = navigateToNextFile;
window.expandContext = expandContext;