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
        // First, sync with server-rendered state by checking which files are initially visible
        $$('[data-file-content]').forEach(contentElement => {
            const filePath = contentElement.dataset.fileContent;
            const isVisible = contentElement.style.display !== 'none';
            if (isVisible) {
                this.expandedFiles.add(filePath);
            }
        });
        
        // Then try to restore from localStorage if available (but don't override server state)
        const saved = localStorage.getItem('difflicious-state');
        if (saved) {
            try {
                const state = JSON.parse(saved);
                // Only add files from localStorage that aren't already handled by server state
                if (state.expandedFiles) {
                    state.expandedFiles.forEach(filePath => {
                        const contentElement = $(`[data-file-content="${filePath}"]`);
                        if (contentElement) {
                            this.expandedFiles.add(filePath);
                        }
                    });
                }
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
async function expandContext(filePath, hunkIndex, direction, contextLines = 10, format = 'pygments') {
    const button = event.target;
    const originalText = button.textContent;
    const expansionId = `expand-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${hunkIndex}-${direction}`;
    
    // Check if context is already expanded
    const existingExpansion = $(`#${expansionId}`);
    if (existingExpansion) {
        // Toggle visibility of existing expansion
        const isVisible = existingExpansion.style.display !== 'none';
        existingExpansion.style.display = isVisible ? 'none' : 'block';
        button.textContent = isVisible ? originalText : '✓';
        return;
    }
    
    // Show loading state
    button.textContent = '...';
    button.disabled = true;
    
    try {
        const params = new URLSearchParams({
            file_path: filePath,
            hunk_index: hunkIndex,
            direction: direction,
            context_lines: contextLines,
            format: format
        });
        
        const response = await fetch(`/api/expand-context?${params}`);
        const result = await response.json();
        
        if (result.status === 'ok') {
            console.log(`Context expansion successful for ${filePath}, format: ${result.format}`);
            
            if (format === 'pygments' && result.format === 'pygments') {
                console.log(`Injecting Pygments CSS and creating HTML for ${result.lines.length} lines`);
                
                // Insert CSS styles if not already present
                injectPygmentsCss(result.css_styles);
                
                // Create and insert expanded context DOM
                const expandedHtml = createExpandedContextHtml(result, expansionId);
                insertExpandedContext(button, filePath, hunkIndex, direction, expandedHtml);
                
                // Update button state
                button.textContent = '✓';
                button.title = `Hide ${contextLines} expanded lines`;
                
                console.log(`Successfully inserted expanded context with ID: ${expansionId}`);
                
            } else {
                console.log(`Using plain format for ${result.lines.length} lines`);
                
                // Handle plain format - create simple HTML
                const expandedHtml = createPlainContextHtml(result, expansionId);
                insertExpandedContext(button, filePath, hunkIndex, direction, expandedHtml);
                
                button.textContent = '✓';
                button.title = `Hide ${contextLines} expanded lines`;
            }
        } else {
            console.error('Context expansion failed:', result.message);
            // Restore button state on error
            button.textContent = originalText;
        }
        
    } catch (error) {
        console.error('Context expansion error:', error);
        // Restore button state on error  
        button.textContent = originalText;
    } finally {
        button.disabled = false;
    }
}

// Helper functions for context expansion

function escapeHtml(text) {
    // Basic HTML escaping for security
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function injectPygmentsCss(cssStyles) {
    // Inject Pygments CSS styles into the document head if not already present
    if (!cssStyles) return;
    
    // Check if Pygments styles are already injected
    if ($('#pygments-styles')) return;
    
    const styleElement = document.createElement('style');
    styleElement.id = 'pygments-styles';
    styleElement.textContent = cssStyles;
    document.head.appendChild(styleElement);
}

function createExpandedContextHtml(result, expansionId) {
    // Create HTML for Pygments-formatted expanded context lines
    const lines = result.lines || [];
    let startLineNum = result.start_line || 1;
    
    let html = `<div id="${expansionId}" class="expanded-context bg-blue-25 border-l-2 border-blue-200">`;
    
    lines.forEach((lineData, index) => {
        const lineNum = startLineNum + index;
        const content = lineData.highlighted_content || lineData.content || '';
        
        html += `
        <div class="diff-line grid grid-cols-2 border-b border-gray-50 hover:bg-gray-25 line-context">
            <!-- Left Side (Before) -->
            <div class="line-left border-r border-gray-200 bg-blue-25">
                <div class="flex">
                    <div class="line-num w-12 px-2 py-1 text-gray-400 text-right bg-blue-50 border-r border-gray-200 select-none">
                        <span>${lineNum}</span>
                    </div>
                    <div class="line-content flex-1 px-2 py-1 overflow-x-auto">
                        <span class="text-gray-400">&nbsp;</span>
                        <span class="highlight">${content}</span>
                    </div>
                </div>
            </div>
            <!-- Right Side (After) -->
            <div class="line-right bg-blue-25">
                <div class="flex">
                    <div class="line-num w-12 px-2 py-1 text-gray-400 text-right bg-blue-50 border-r border-gray-200 select-none">
                        <span>${lineNum}</span>
                    </div>
                    <div class="line-content flex-1 px-2 py-1 overflow-x-auto">
                        <span class="text-gray-400">&nbsp;</span>
                        <span class="highlight">${content}</span>
                    </div>
                </div>
            </div>
        </div>`;
    });
    
    html += '</div>';
    return html;
}

function createPlainContextHtml(result, expansionId) {
    // Create HTML for plain text expanded context lines
    const lines = result.lines || [];
    let startLineNum = result.start_line || 1;
    
    let html = `<div id="${expansionId}" class="expanded-context bg-gray-25 border-l-2 border-gray-300">`;
    
    lines.forEach((line, index) => {
        const lineNum = startLineNum + index;
        const content = escapeHtml(line || '');
        
        html += `
        <div class="diff-line grid grid-cols-2 border-b border-gray-50 hover:bg-gray-25 line-context">
            <!-- Left Side (Before) -->
            <div class="line-left border-r border-gray-200 bg-gray-25">
                <div class="flex">
                    <div class="line-num w-12 px-2 py-1 text-gray-400 text-right bg-gray-50 border-r border-gray-200 select-none">
                        <span>${lineNum}</span>
                    </div>
                    <div class="line-content flex-1 px-2 py-1 overflow-x-auto">
                        <span class="text-gray-400">&nbsp;</span>
                        <span>${content}</span>
                    </div>
                </div>
            </div>
            <!-- Right Side (After) -->
            <div class="line-right bg-gray-25">
                <div class="flex">
                    <div class="line-num w-12 px-2 py-1 text-gray-400 text-right bg-gray-50 border-r border-gray-200 select-none">
                        <span>${lineNum}</span>
                    </div>
                    <div class="line-content flex-1 px-2 py-1 overflow-x-auto">
                        <span class="text-gray-400">&nbsp;</span>
                        <span>${content}</span>
                    </div>
                </div>
            </div>
        </div>`;
    });
    
    html += '</div>';
    return html;
}

function insertExpandedContext(button, filePath, hunkIndex, direction, expandedHtml) {
    // Insert expanded context HTML into the appropriate location in the DOM
    console.log(`Inserting expanded context for ${filePath}, direction: ${direction}`);
    
    // Find the specific hunk using the button's parent elements
    const hunkElement = button.closest('.hunk');
    if (!hunkElement) {
        console.error('Could not find hunk element for insertion');
        return;
    }
    
    // Find the hunk lines container within this specific hunk
    const hunkLinesElement = hunkElement.querySelector('.hunk-lines');
    if (!hunkLinesElement) {
        console.error('Could not find hunk-lines element for insertion');
        return;
    }
    
    console.log(`Found hunk-lines element, creating expanded content...`);
    
    // Create a temporary container to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = expandedHtml;
    const expandedElement = tempDiv.firstElementChild;
    
    if (!expandedElement) {
        console.error('Failed to create expanded element from HTML');
        return;
    }
    
    if (direction === 'before') {
        // Insert at the beginning of hunk-lines
        console.log('Inserting expanded content before existing lines');
        hunkLinesElement.insertBefore(expandedElement, hunkLinesElement.firstChild);
    } else {
        // Insert at the end of hunk-lines
        console.log('Inserting expanded content after existing lines');
        hunkLinesElement.appendChild(expandedElement);
    }
    
    console.log(`Successfully inserted expanded content into DOM`);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    DiffState.init();
    
    // Apply initial state
    setTimeout(() => {
        // Sync toggle icons with current display state
        $$('[data-file]').forEach(fileElement => {
            const filePath = fileElement.dataset.file;
            const contentElement = $(`[data-file-content="${filePath}"]`);
            const toggleIcon = fileElement.querySelector('.toggle-icon');
            
            if (contentElement && toggleIcon) {
                const isVisible = contentElement.style.display !== 'none';
                toggleIcon.textContent = isVisible ? '▼' : '▶';
                toggleIcon.dataset.expanded = isVisible ? 'true' : 'false';
                
                // Make sure our state matches the display
                if (isVisible) {
                    DiffState.expandedFiles.add(filePath);
                } else {
                    DiffState.expandedFiles.delete(filePath);
                }
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