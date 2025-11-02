/**
 * Minimal JavaScript for diff interactions
 * Replaces Alpine.js with lightweight vanilla JS
 */

// Debug toggle
const DEBUG = false;

// DOM manipulation utilities
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// State management
const DiffState = {
    expandedFiles: new Set(),
    expandedGroups: new Set(['untracked', 'unstaged', 'staged']),
    repositoryName: null,
    storageKey: 'difflicious-state', // fallback key
    theme: 'light', // current theme

    async init() {
        await this.initializeRepository();
        this.bindEventListeners();
        this.restoreState();
        this.installSearchHotkeys();
        this.installLiveSearchFilter();
    },

    async initializeRepository() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            if (data.status === 'ok' && data.repository_name) {
                this.repositoryName = data.repository_name;
                this.storageKey = `difflicious-${this.repositoryName}`;
                if (DEBUG) console.log(`Initialized for repository: ${this.repositoryName}, storage key: ${this.storageKey}`);
            } else {
                if (DEBUG) console.warn('Failed to get repository name, using fallback storage key');
            }
        } catch (error) {
            if (DEBUG) console.warn('Error fetching repository info:', error);
        }
    },

    bindEventListeners() {
        // Global expand/collapse buttons
        const expandAllBtn = $('#expandAll');
        const collapseAllBtn = $('#collapseAll');

        if (expandAllBtn) expandAllBtn.addEventListener('click', () => expandAllFiles());
        if (collapseAllBtn) collapseAllBtn.addEventListener('click', () => collapseAllFiles());

        // Form auto-submit on changes
        $$('input[type="checkbox"], select').forEach(input => {
            input.addEventListener('change', () => {
                input.closest('form')?.submit();
            });
        });
    },

    restoreState() {
        // First, sync with server-rendered state by checking which files are initially visible
        const serverExpandedFiles = new Set();
        $$('[data-file-content]').forEach(contentElement => {
            const filePath = contentElement.dataset.fileContent;
            const isVisible = contentElement.style.display !== 'none';
            if (isVisible) {
                serverExpandedFiles.add(filePath);
            }
        });

        // Then try to restore from localStorage if available
        const saved = localStorage.getItem(this.storageKey);
        if (saved) {
            try {
                const state = JSON.parse(saved);

                // Restore file expansion states
                if (state.expandedFiles) {
                    // Merge server state with localStorage state
                    // Server state (visible files) takes priority and should always be included
                    const savedExpandedFiles = new Set(state.expandedFiles);
                    this.expandedFiles = new Set([...serverExpandedFiles, ...savedExpandedFiles]);

                    // Apply the merged state to all files
                    $$('[data-file-content]').forEach(contentElement => {
                        const filePath = contentElement.dataset.fileContent;
                        const fileElement = $(`[data-file="${filePath}"]`);
                        const toggleIcon = fileElement?.querySelector('.toggle-icon');

                        if (contentElement && fileElement && toggleIcon) {
                            // Prioritize server state (if file is visible, it should be expanded)
                            // Otherwise use saved state
                            const shouldBeExpanded = serverExpandedFiles.has(filePath) || savedExpandedFiles.has(filePath);

                            // Apply visual state based on merged state
                            contentElement.style.display = shouldBeExpanded ? 'block' : 'none';
                            toggleIcon.textContent = shouldBeExpanded ? '▼' : '▶';
                            toggleIcon.dataset.expanded = shouldBeExpanded ? 'true' : 'false';

                            if (DEBUG) console.log(`Restored ${shouldBeExpanded ? 'expanded' : 'collapsed'} state for file: ${filePath}`);
                        }
                    });
                } else {
                    // No saved files, just use server state
                    this.expandedFiles = serverExpandedFiles;
                }

                // Restore group expansion states
                if (state.expandedGroups) {
                    this.expandedGroups = new Set(state.expandedGroups);
                } else {
                    // Default expanded groups if no saved state
                    this.expandedGroups = new Set(['untracked', 'unstaged', 'staged']);
                }

                // Apply visual state to all groups based on expandedGroups set
                const allPossibleGroups = ['untracked', 'unstaged', 'staged', 'changes'];
                allPossibleGroups.forEach(groupKey => {
                    const contentElement = $(`[data-group-content="${groupKey}"]`);
                    const groupElement = $(`[data-group="${groupKey}"]`);
                    const toggleIcon = groupElement?.querySelector('.toggle-icon');

                    if (contentElement && toggleIcon) {
                        const shouldBeExpanded = this.expandedGroups.has(groupKey);

                        contentElement.style.display = shouldBeExpanded ? 'block' : 'none';
                        toggleIcon.textContent = shouldBeExpanded ? '▼' : '▶';
                        toggleIcon.dataset.expanded = shouldBeExpanded ? 'true' : 'false';

                        if (DEBUG) console.log(`Restored ${shouldBeExpanded ? 'expanded' : 'collapsed'} state for group: ${groupKey}`);
                    }
                });

                if (DEBUG) console.log(`Restored state for ${this.repositoryName}:`, state);
            } catch (e) {
                if (DEBUG) console.warn('Failed to restore state:', e);
                // Use defaults on error, but preserve server state
                this.expandedFiles = serverExpandedFiles;
                this.expandedGroups = new Set(['untracked', 'unstaged', 'staged']);
            }
        } else {
            // No saved state, use server state and defaults
            this.expandedFiles = serverExpandedFiles;
            this.expandedGroups = new Set(['untracked', 'unstaged', 'staged']);
        }
    },

    saveState() {
        const state = {
            expandedFiles: Array.from(this.expandedFiles),
            expandedGroups: Array.from(this.expandedGroups),
            repositoryName: this.repositoryName,
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(state));
        if (DEBUG) console.log(`Saved state for ${this.repositoryName}:`, state);
    },
    installSearchHotkeys() {
        document.addEventListener('keydown', (e) => {
            const active = document.activeElement;
            const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

            if (e.key === '/' && !isTyping) {
                e.preventDefault();
                const searchInput = document.querySelector('input[name="search"]');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }

            if (e.key === 'Escape' && active && active.id === 'diff-search-input') {
                e.preventDefault();
                active.value = '';
                applyFilenameFilter('');
                const clearBtn = document.querySelector('#diff-search-clear');
                if (clearBtn) clearBtn.classList.add('hidden');
                active.blur();
            }

            // Enter no longer cycles results; filtering is live on input
        });
    },

    installLiveSearchFilter() {
        const searchInput = document.querySelector('#diff-search-input');
        const clearBtn = document.querySelector('#diff-search-clear');
        if (!searchInput) return;

        const applyFilter = () => {
            const query = (searchInput.value || '').trim();
            applyFilenameFilter(query);
            // Toggle clear button visibility
            if (clearBtn) clearBtn.classList.toggle('hidden', query.length === 0);
        };
        searchInput.addEventListener('input', applyFilter);

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                applyFilenameFilter('');
                clearBtn.classList.add('hidden');
                searchInput.focus();
            });
        }

        // Apply initial filter if there is an existing value
        applyFilter();
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
    // Batch DOM operations to avoid layout thrashing
    const elementsToUpdate = [];
    const filesToAdd = [];

    // Collect all elements that need updates first (minimize DOM queries)
    $$('[data-file]').forEach(fileElement => {
        const filePath = fileElement.dataset.file;
        if (filePath) {
            const contentElement = $(`[data-file-content="${filePath}"]`);
            const isVisuallyExpanded = contentElement && contentElement.style.display !== 'none';

            if (!isVisuallyExpanded && contentElement) {
                const toggleIcon = fileElement.querySelector('.toggle-icon');
                elementsToUpdate.push({
                    contentElement,
                    toggleIcon,
                    filePath
                });
                filesToAdd.push(filePath);
            }
        }
    });

    // Batch DOM updates to minimize browser reflows
    if (elementsToUpdate.length > 0) {
        // Use requestAnimationFrame for smoother performance
        requestAnimationFrame(() => {
            elementsToUpdate.forEach(({ contentElement, toggleIcon }) => {
                contentElement.style.display = 'block';
                if (toggleIcon) {
                    toggleIcon.textContent = '▼';
                    toggleIcon.dataset.expanded = 'true';
                }
            });
        });

        // Update internal state in batch
        filesToAdd.forEach(filePath => DiffState.expandedFiles.add(filePath));

        // Save state once after all changes
        DiffState.saveState();
    }
}

function collapseAllFiles() {
    // Batch DOM operations to avoid layout thrashing
    const elementsToUpdate = [];
    const filesToRemove = [];

    // Collect all elements that need updates first (minimize DOM queries)
    $$('[data-file]').forEach(fileElement => {
        const filePath = fileElement.dataset.file;
        if (filePath) {
            const contentElement = $(`[data-file-content="${filePath}"]`);
            const isVisuallyExpanded = contentElement && contentElement.style.display !== 'none';

            if (isVisuallyExpanded && contentElement) {
                const toggleIcon = fileElement.querySelector('.toggle-icon');
                elementsToUpdate.push({
                    contentElement,
                    toggleIcon,
                    filePath
                });
                filesToRemove.push(filePath);
            }
        }
    });

    // Batch DOM updates to minimize browser reflows
    if (elementsToUpdate.length > 0) {
        // Use requestAnimationFrame for smoother performance
        requestAnimationFrame(() => {
            elementsToUpdate.forEach(({ contentElement, toggleIcon }) => {
                contentElement.style.display = 'none';
                if (toggleIcon) {
                    toggleIcon.textContent = '▶';
                    toggleIcon.dataset.expanded = 'false';
                }
            });
        });

        // Update internal state in batch
        filesToRemove.forEach(filePath => DiffState.expandedFiles.delete(filePath));

        // Save state once after all changes
        DiffState.saveState();
    }
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
async function expandContext(button, filePath, hunkIndex, direction, contextLines = 10, format = 'pygments') {
    if (DEBUG) console.log(`🔥 expandContext called! File: ${filePath}, Direction: ${direction}, Range: ${button.dataset.targetStart}-${button.dataset.targetEnd}`);

    const originalText = button.textContent;
    const timestamp = Date.now();
    const expansionId = `expand-${filePath.replace(/[^a-zA-Z0-9]/g, '_')}-${hunkIndex}-${direction}-${timestamp}`;

    // Get button target range data
    const targetStart = parseInt(button.dataset.targetStart);
    const targetEnd = parseInt(button.dataset.targetEnd);

    // Show loading state
    button.textContent = '...';
    button.disabled = true;

    try {
        const params = new URLSearchParams({
            file_path: filePath,
            hunk_index: hunkIndex,
            direction,
            context_lines: contextLines,
            format,
            target_start: targetStart,
            target_end: targetEnd
        });

        const response = await fetch(`/api/expand-context?${params}`);
        const result = await response.json();

        if (result.status === 'ok') {
            if (DEBUG) console.log(`Context expansion successful for ${filePath}, format: ${result.format}`);

            // Handle format-specific processing
            let expandedHtml;
            if (format === 'pygments' && result.format === 'pygments') {
                if (DEBUG) console.log(`Injecting Pygments CSS and creating HTML for ${result.lines.length} lines`);
                injectPygmentsCss(result.css_styles);
                expandedHtml = createExpandedContextHtml(result, expansionId, button, direction);
            } else {
                if (DEBUG) console.log(`Using plain format for ${result.lines.length} lines`);
                expandedHtml = createPlainContextHtml(result, expansionId, button, direction);
            }

            // Insert the expanded context
            insertExpandedContext(button, filePath, hunkIndex, direction, expandedHtml);

            // Update data attributes after expansion to maintain consistency for future expansions
            updateHunkLinesDataAttributes(button, direction, result.lines.length);

            // Common post-processing logic
            handlePostExpansionLogic(button, result, contextLines, targetStart, targetEnd, direction, originalText);

            if (DEBUG) console.log(`Successfully inserted expanded context with ID: ${expansionId}`);
        } else {
            if (DEBUG) console.error('Context expansion failed:', result.message);
            button.textContent = originalText;
        }
    } catch (error) {
        if (DEBUG) console.error('Context expansion error:', error);
        button.textContent = originalText;
    } finally {
        button.disabled = false;
    }
}

// Helper function to handle all post-expansion logic
function handlePostExpansionLogic(button, result, contextLines, targetStart, targetEnd, direction, originalText) {
    const linesReceived = result.lines.length;
    let shouldHideButton = linesReceived < contextLines;

    // Check if expansion would make this hunk adjacent to adjacent hunks
    shouldHideButton = checkHunkAdjacency(button, direction, targetStart, targetEnd) || shouldHideButton;

    if (shouldHideButton) {
        handleButtonHiding(button, direction, targetStart, targetEnd);
    } else {
        updateButtonForNextExpansion(button, direction, targetStart, targetEnd, contextLines, originalText);
    }

    // Update hunk range data to include the expanded lines
    updateHunkRangeAfterExpansion(button, targetStart, targetEnd);

    // Check for potential hunk merging
    checkAndMergeHunks(button);
}

// Helper function to check if expansion makes hunks adjacent
function checkHunkAdjacency(button, direction, targetStart, targetEnd) {
    if (direction === 'after') {
        const context = hunkContext(button);
        if (!context?.fileElement) return false;

        const { currentHunk, nextHunk } = context;
        if (nextHunk) {
            const nextHunkStart = parseInt(nextHunk.dataset.lineStart);
            if (targetEnd === nextHunkStart - 1) {
                // Hide both before buttons in the next hunk (left and right sides)
                const nextHunkBeforeBtns = nextHunk.querySelectorAll('.expansion-btn[data-direction="before"]');
                nextHunkBeforeBtns.forEach(btn => {
                    btn.style.display = 'none';
                });
                if (nextHunkBeforeBtns.length > 0) {
                    hideExpansionBarIfAllButtonsHidden(nextHunkBeforeBtns[0]);
                }

                // Also hide all remaining after buttons in the current hunk since no more expansion is possible
                const currentHunkAfterBtns = currentHunk.querySelectorAll('.expansion-btn[data-direction="after"]');
                currentHunkAfterBtns.forEach(btn => {
                    btn.style.display = 'none';
                });
                if (currentHunkAfterBtns.length > 0) {
                    hideExpansionBarIfAllButtonsHidden(currentHunkAfterBtns[0]);
                }

                return true;
            }
        }
    } else if (direction === 'before') {
        const context = hunkContext(button);
        if (!context?.fileElement) return false;

        const { currentHunk, prevHunk } = context;
        if (prevHunk) {
            const prevHunkEnd = parseInt(prevHunk.dataset.lineEnd);
            if (targetStart <= prevHunkEnd + 1) {
                // Hide both after buttons in the previous hunk (left and right sides)
                const prevHunkAfterBtns = prevHunk.querySelectorAll('.expansion-btn[data-direction="after"]');
                prevHunkAfterBtns.forEach(btn => {
                    btn.style.display = 'none';
                });
                if (prevHunkAfterBtns.length > 0) {
                    hideExpansionBarIfAllButtonsHidden(prevHunkAfterBtns[0]);
                }

                // Also hide all remaining before buttons in the current hunk since no more expansion is possible
                const currentHunkBeforeBtns = currentHunk.querySelectorAll('.expansion-btn[data-direction="before"]');
                currentHunkBeforeBtns.forEach(btn => {
                    btn.style.display = 'none';
                });
                if (currentHunkBeforeBtns.length > 0) {
                    hideExpansionBarIfAllButtonsHidden(currentHunkBeforeBtns[0]);
                }

                return true;
            }
        }
    }
    return false;
}

// Helper function to handle button hiding logic
function handleButtonHiding(button, direction, targetStart, targetEnd) {
    // End of file reached or touching next hunk - hide both buttons (left and right sides)
    const context = hunkContext(button);
    if (!context) return;

    const { currentHunk } = context;
    const sameSideButtons = currentHunk.querySelectorAll(`.expansion-btn[data-direction="${direction}"][data-target-start="${targetStart}"][data-target-end="${targetEnd}"]`);
    sameSideButtons.forEach(btn => {
        btn.style.display = 'none';
    });
    if (DEBUG) console.log(`Hiding button. Target range: ${targetStart}-${targetEnd}`);

    // If this was an up button that reached line 1, hide all buttons (file fully expanded)
    if (direction === 'before' && targetStart === 1) {
        if (DEBUG) console.log('Up button reached line 1 - hiding all expansion buttons');
        hideAllExpansionButtonsInHunk(button);
    }

    // Check if all expansion buttons in this hunk are now hidden
    hideExpansionBarIfAllButtonsHidden(button);
}

// Helper function to update button for next expansion
function updateButtonForNextExpansion(button, direction, targetStart, targetEnd, contextLines, originalText) {
    // More lines available - update button for next expansion
    button.textContent = originalText;
    button.title = `Expand ${contextLines} more lines ${direction}`;

    // Update button's target range for next click
    if (direction === 'before') {
        const newTargetEnd = targetStart - 1;
        const newTargetStart = Math.max(1, newTargetEnd - contextLines + 1);

        // Check if we've reached the beginning of the file
        if (targetStart === 1) {
            // Beginning of file reached - hide both buttons (left and right sides)
            const context = hunkContext(button);
            if (!context) return;

            const { currentHunk } = context;
            const sameSideButtons = currentHunk.querySelectorAll(`.expansion-btn[data-direction="${direction}"][data-target-start="${targetStart}"][data-target-end="${targetEnd}"]`);
            sameSideButtons.forEach(btn => {
                btn.style.display = 'none';
            });
            if (DEBUG) console.log(`Beginning of file reached. Current targetStart was ${targetStart}. Hiding up buttons.`);
            hideExpansionBarIfAllButtonsHidden(button);
        } else {
            // Check for overlap with previous hunk before setting new range
            const context = hunkContext(button);
            if (!context) return;

            const { currentHunk, fileElement, prevHunk } = context;
            let adjustedTargetStart = newTargetStart;

            if (fileElement && prevHunk) {
                const prevHunkEnd = parseInt(prevHunk.dataset.lineEnd);

                // Ensure we don't expand into the previous hunk's visible range
                adjustedTargetStart = Math.max(adjustedTargetStart, prevHunkEnd + 1);

                // If adjustment makes the range invalid (start > end), hide both buttons (left and right sides)
                if (adjustedTargetStart > newTargetEnd) {
                    const sameSideButtons = currentHunk.querySelectorAll(`.expansion-btn[data-direction="${direction}"][data-target-start="${targetStart}"][data-target-end="${targetEnd}"]`);
                    sameSideButtons.forEach(btn => {
                        btn.style.display = 'none';
                    });
                    if (DEBUG) console.log('No room for expansion between hunks. Hiding up buttons.');
                    hideExpansionBarIfAllButtonsHidden(button);
                    return;
                }
            }

            button.dataset.targetStart = adjustedTargetStart;
            button.dataset.targetEnd = newTargetEnd;
        }
    } else {
        const newTargetStart = targetEnd + 1;
        const newTargetEnd = newTargetStart + contextLines - 1;

        // Check for overlap with next hunk before setting new range
        const context = hunkContext(button);
        if (!context) return;

        const { currentHunk, fileElement, nextHunk } = context;
        let adjustedTargetEnd = newTargetEnd;

        if (fileElement && nextHunk) {
            const nextHunkStart = parseInt(nextHunk.dataset.lineStart);

            // Ensure we don't expand into the next hunk's visible range
            adjustedTargetEnd = Math.min(adjustedTargetEnd, nextHunkStart - 1);

            // If adjustment makes the range invalid (start > end), hide both buttons (left and right sides)
            if (newTargetStart > adjustedTargetEnd) {
                const sameSideButtons = currentHunk.querySelectorAll(`.expansion-btn[data-direction="${direction}"][data-target-start="${targetStart}"][data-target-end="${targetEnd}"]`);
                sameSideButtons.forEach(btn => {
                    btn.style.display = 'none';
                });
                if (DEBUG) console.log('No room for expansion between hunks. Hiding down buttons.');
                hideExpansionBarIfAllButtonsHidden(button);
                return;
            }
        }

        button.dataset.targetStart = newTargetStart;
        button.dataset.targetEnd = adjustedTargetEnd;
    }
}

// Helper function to get hunk context from a button
function hunkContext(button) {
    const currentHunk = button.closest('.hunk');
    if (!currentHunk) {
        return null;
    }

    const fileElement = currentHunk.closest('[data-file]');
    if (!fileElement) {
        return { currentHunk, fileElement: null, allHunks: [], currentIndex: -1, prevHunk: null, nextHunk: null };
    }

    const allHunks = Array.from(fileElement.querySelectorAll('.hunk'));
    const currentIndex = allHunks.indexOf(currentHunk);

    return {
        currentHunk,
        fileElement,
        allHunks,
        currentIndex,
        prevHunk: currentIndex > 0 ? allHunks[currentIndex - 1] : null,
        nextHunk: currentIndex < allHunks.length - 1 ? allHunks[currentIndex + 1] : null
    };
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

function createExpandedContextHtml(result, expansionId, triggerButton, direction) {
    // Create HTML for Pygments-formatted expanded context lines
    const lines = result.lines || [];

    // Use the original working logic from before the broken refactoring
    const context = hunkContext(triggerButton);
    const hunkLinesDiv = context?.currentHunk?.querySelector('.hunk-lines');

    let startLineNumLeft, startLineNumRight;

    if (hunkLinesDiv) {
        const curRightStart = parseInt(hunkLinesDiv.dataset.rightStartLine);
        const curRightEnd = parseInt(hunkLinesDiv.dataset.rightEndLine);
        const curLeftStart = parseInt(hunkLinesDiv.dataset.leftStartLine || '0');
        const curLeftEnd = parseInt(hunkLinesDiv.dataset.leftEndLine || '0');

        if (direction === 'after') {
            // Right side: continue from right end
            startLineNumRight = curRightEnd + 1;

            // Left side: use the ORIGINAL working logic that was removed
            const leftBase = (curLeftEnd || (curLeftStart + (curRightEnd - curRightStart)));
            startLineNumLeft = (leftBase || 0) + 1;

            if (DEBUG) console.log(`After expansion (original logic): curLeftStart=${curLeftStart}, curLeftEnd=${curLeftEnd}, curRightStart=${curRightStart}, curRightEnd=${curRightEnd}, leftBase=${leftBase}, calculated: left=${startLineNumLeft}, right=${startLineNumRight}`);
        } else if (direction === 'before') {
            // Right side: expand backwards
            startLineNumRight = curRightStart - lines.length;

            // Left side: use the ORIGINAL working logic that was removed
            const leftEndBefore = (curLeftStart || 1) - 1;
            startLineNumLeft = Math.max(1, leftEndBefore - (lines.length - 1));

            if (DEBUG) console.log(`Before expansion (original logic): curLeftStart=${curLeftStart}, leftEndBefore=${leftEndBefore}, lines=${lines.length}, calculated: left=${startLineNumLeft}, right=${startLineNumRight}`);
        }
    } else {
        // Fallback: should not happen with proper data attributes
        if (DEBUG) console.warn('Missing hunk-lines data attributes, using fallback line numbering');
        startLineNumRight = 1;
        startLineNumLeft = 1;
    }

    let html = `<div id="${expansionId}" class="expanded-context bg-neutral-25">`;

    lines.forEach((lineData, index) => {
        const lineNumRight = startLineNumRight + index;
        const lineNumLeft = startLineNumLeft + index;
        const content = lineData.highlighted_content || lineData.content || '';

        html += `
        <div class="diff-line grid grid-cols-2 hover:bg-neutral-25 line-context">
            <!-- Left Side (Before) -->
            <div class="line-left border-r border-neutral-200">
                <div class="flex">
                    <div class="line-num w-12 px-2 py-1 text-neutral-400 text-right border-r border-neutral-200 select-none">
                        <span>${lineNumLeft}</span>
                    </div>
                    <div class="line-content flex-1 px-2 py-1 overflow-x-auto min-w-0">
                        <span class="text-neutral-400">&nbsp;</span>
                        <span class="highlight break-words">${content}</span>
                        ${lineData.missing_newline ? '<span class="no-newline-indicator text-danger-text-500">↩</span>' : ''}
                    </div>
                </div>
            </div>
            <!-- Right Side (After) -->
            <div class="line-right">
                <div class="flex">
                    <div class="line-num w-12 px-2 py-1 text-neutral-400 text-right border-r border-neutral-200 select-none">
                        <span>${lineNumRight}</span>
                    </div>
                    <div class="line-content flex-1 px-2 py-1 overflow-x-auto min-w-0">
                        <span class="text-neutral-400">&nbsp;</span>
                        <span class="highlight break-words">${content}</span>
                        ${lineData.missing_newline ? '<span class="no-newline-indicator text-danger-text-500">↩</span>' : ''}
                    </div>
                </div>
            </div>
        </div>`;
    });

    html += '</div>';
    return html;
}

function createPlainContextHtml(result, expansionId, triggerButton, direction) {
    // Create HTML for plain text expanded context lines
    const lines = result.lines || [];

    // Get line numbers from the hunk-lines data attributes
    const context = hunkContext(triggerButton);
    const hunkLinesDiv = context?.currentHunk?.querySelector('.hunk-lines');

    let startLineNumLeft, startLineNumRight;

    if (hunkLinesDiv && direction === 'before') {
        // For 'before' expansion, calculate backwards from the current hunk start
        const currentLeftStart = parseInt(hunkLinesDiv.dataset.leftStartLine);
        const currentRightStart = parseInt(hunkLinesDiv.dataset.rightStartLine);

        if (isNaN(currentLeftStart) || isNaN(currentRightStart)) {
            if (DEBUG) console.warn('Invalid hunk data attributes for before expansion, using fallback');
            startLineNumRight = result.right_start_line || result.start_line || 1;
            startLineNumLeft = result.left_start_line || startLineNumRight;
        } else {
            // Both sides expand backwards by the same number of lines
            startLineNumLeft = currentLeftStart - lines.length;
            startLineNumRight = currentRightStart - lines.length;
            if (DEBUG) console.log(`Before expansion: leftStart=${currentLeftStart}, rightStart=${currentRightStart}, expansion lines=${lines.length}, calculated start: left=${startLineNumLeft}, right=${startLineNumRight}`);
        }
    } else if (hunkLinesDiv && direction === 'after') {
        // For 'after' expansion, we need to check if left/right sides have diverged
        const currentLeftEnd = parseInt(hunkLinesDiv.dataset.leftEndLine);
        const currentRightEnd = parseInt(hunkLinesDiv.dataset.rightEndLine);

        if (isNaN(currentLeftEnd) || isNaN(currentRightEnd)) {
            if (DEBUG) console.warn('Invalid hunk data attributes for after expansion, using fallback');
            startLineNumRight = result.right_start_line || result.start_line || 1;
            startLineNumLeft = result.left_start_line || startLineNumRight;
        } else {
            // Right side always continues from the right end
            startLineNumRight = currentRightEnd + 1;

            // Left side logic: if left and right are tracking together, continue together
            // Otherwise, left side continues from its own end
            if (currentLeftEnd === 0) {
                // Left side hasn't been set or is at 0, derive from right side
                startLineNumLeft = startLineNumRight;
            } else {
                // Left side has its own tracking, continue from its end
                startLineNumLeft = currentLeftEnd + 1;
            }

            if (DEBUG) console.log(`After expansion: leftEnd=${currentLeftEnd}, rightEnd=${currentRightEnd}, calculated start: left=${startLineNumLeft}, right=${startLineNumRight}`);
        }
    } else {
        // Fallback: should not happen with proper data attributes
        if (DEBUG) console.warn('Missing hunk-lines div or invalid direction, using fallback line numbering');
        startLineNumRight = result.right_start_line || result.start_line || 1;
        startLineNumLeft = result.left_start_line || startLineNumRight;
    }

    let html = `<div id="${expansionId}" class="expanded-context bg-neutral-25">`;

    lines.forEach((line, index) => {
        const lineNumRight = startLineNumRight + index;
        const lineNumLeft = startLineNumLeft + index;
        const content = escapeHtml(line || '');

        html += `
        <div class="diff-line grid grid-cols-2 hover:bg-neutral-25 line-context">
            <!-- Left Side (Before) -->
            <div class="line-left border-r border-neutral-200">
                <div class="flex">
                    <div class="line-num w-12 px-2 py-1 text-neutral-400 text-right border-r border-neutral-200 select-none">
                        <span>${lineNumLeft}</span>
                    </div>
                    <div class="line-content flex-1 px-2 py-1 overflow-x-auto min-w-0">
                        <span class="text-neutral-400">&nbsp;</span>
                        <span class="break-words">${content}</span>
                        ${line.missing_newline ? '<span class="no-newline-indicator text-danger-text-500">↩</span>' : ''}
                    </div>
                </div>
            </div>
            <!-- Right Side (After) -->
            <div class="line-right">
                <div class="flex">
                    <div class="line-num w-12 px-2 py-1 text-neutral-400 text-right border-r border-neutral-200 select-none">
                        <span>${lineNumRight}</span>
                    </div>
                    <div class="line-content flex-1 px-2 py-1 overflow-x-auto min-w-0">
                        <span class="text-neutral-400">&nbsp;</span>
                        <span class="break-words">${content}</span>
                        ${line.missing_newline ? '<span class="no-newline-indicator text-danger-text-500">↩</span>' : ''}
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
    if (DEBUG) console.log(`Inserting expanded context for ${filePath}, direction: ${direction}`);

    // Find the specific hunk using the button's parent elements
    const context = hunkContext(button);
    if (!context) {
        if (DEBUG) console.error('Could not find hunk element for insertion');
        return;
    }

    // Find the hunk lines container within this specific hunk
    const { currentHunk } = context;
    const hunkLinesElement = currentHunk.querySelector('.hunk-lines');
    if (!hunkLinesElement) {
        if (DEBUG) console.error('Could not find hunk-lines element for insertion');
        return;
    }

    if (DEBUG) console.log('Found hunk-lines element, creating expanded content...');

    // Create a temporary container to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = expandedHtml;
    const expandedElement = tempDiv.firstElementChild;

    if (!expandedElement) {
        if (DEBUG) console.error('Failed to create expanded element from HTML');
        return;
    }

    if (direction === 'before') {
        // Insert at the beginning of hunk-lines
        if (DEBUG) console.log('Inserting expanded content before existing lines');
        hunkLinesElement.insertBefore(expandedElement, hunkLinesElement.firstChild);
    } else {
        // Insert at the end of hunk-lines
        if (DEBUG) console.log('Inserting expanded content after existing lines');
        hunkLinesElement.appendChild(expandedElement);
    }

    if (DEBUG) console.log('Successfully inserted expanded content into DOM');
}

// Range conflict detection and state management functions

function updateHunkLinesDataAttributes(button, direction, linesAdded) {
    // Find the hunk-lines div and update its data attributes
    const context = hunkContext(button);
    const hunkLinesDiv = context?.currentHunk?.querySelector('.hunk-lines');

    if (!hunkLinesDiv) return;

    const currentLeftStart = parseInt(hunkLinesDiv.dataset.leftStartLine);
    const currentLeftEnd = parseInt(hunkLinesDiv.dataset.leftEndLine);
    const currentRightStart = parseInt(hunkLinesDiv.dataset.rightStartLine);
    const currentRightEnd = parseInt(hunkLinesDiv.dataset.rightEndLine);

    if (DEBUG) console.log(`Updating hunk data attributes: direction=${direction}, linesAdded=${linesAdded}, current: leftStart=${currentLeftStart}, leftEnd=${currentLeftEnd}, rightStart=${currentRightStart}, rightEnd=${currentRightEnd}`);

    if (direction === 'before') {
        // Update start lines by moving them backwards
        hunkLinesDiv.dataset.leftStartLine = (currentLeftStart - linesAdded).toString();
        hunkLinesDiv.dataset.rightStartLine = (currentRightStart - linesAdded).toString();
    } else if (direction === 'after') {
        // Update end lines by moving them forwards
        hunkLinesDiv.dataset.leftEndLine = (currentLeftEnd + linesAdded).toString();
        hunkLinesDiv.dataset.rightEndLine = (currentRightEnd + linesAdded).toString();
    }

    if (DEBUG) console.log(`Updated hunk data attributes: leftStart=${hunkLinesDiv.dataset.leftStartLine}, leftEnd=${hunkLinesDiv.dataset.leftEndLine}, rightStart=${hunkLinesDiv.dataset.rightStartLine}, rightEnd=${hunkLinesDiv.dataset.rightEndLine}`);
}

function updateHunkRangeAfterExpansion(button, targetStart, targetEnd) {
    // Get the hunk element containing this button
    const context = hunkContext(button);
    if (!context) return;

    // Get current range
    const { currentHunk } = context;
    const currentStart = parseInt(currentHunk.dataset.lineStart);
    const currentEnd = parseInt(currentHunk.dataset.lineEnd);
    const currentLeftStart = parseInt(currentHunk.dataset.leftLineStart || '0');
    const currentLeftEnd = parseInt(currentHunk.dataset.leftLineEnd || '0');

    // Calculate new expanded right-side range
    const newStart = Math.min(currentStart, targetStart);
    const newEnd = Math.max(currentEnd, targetEnd);
    const insertedLength = Math.max(0, targetEnd - targetStart + 1);

    // Update hunk data attributes
    // Update right side range
    currentHunk.dataset.lineStart = newStart;
    currentHunk.dataset.lineEnd = newEnd;

    // Update left side range using only the newly inserted span
    const dir = directionFromButton(button);
    if (dir === 'after') {
        const prevLeftEnd = isNaN(currentLeftEnd) || currentLeftEnd === 0
            ? (isNaN(currentLeftStart) || currentLeftStart === 0 ? 0 : (currentLeftStart + (currentEnd - currentStart)))
            : currentLeftEnd;
        const leftStart = prevLeftEnd + 1;
        const leftEnd = leftStart + Math.max(0, insertedLength - 1);
        currentHunk.dataset.leftLineStart = leftStart.toString();
        currentHunk.dataset.leftLineEnd = leftEnd.toString();
    } else if (dir === 'before') {
        const prevLeftStart = isNaN(currentLeftStart) || currentLeftStart === 0 ? 1 : currentLeftStart;
        const leftEnd = prevLeftStart - 1;
        const leftStart = Math.max(1, leftEnd - Math.max(0, insertedLength - 1));
        currentHunk.dataset.leftLineStart = leftStart.toString();
        currentHunk.dataset.leftLineEnd = leftEnd.toString();
    }

    if (DEBUG) console.log(`Updated hunk range from ${currentStart}-${currentEnd} to ${newStart}-${newEnd}`);
}

// Determine expansion direction from button dataset
function directionFromButton(button) {
    const d = (button?.dataset?.direction || '').toLowerCase();
    return d === 'after' ? 'after' : 'before';
}

function hideAllExpansionButtonsInHunk(triggerButton) {
    // Get the hunk element containing the trigger button
    const hunkElement = triggerButton.closest('.hunk');
    if (!hunkElement) return;

    // Find the expansion bar within this hunk
    const expansionBar = hunkElement.querySelector('.hunk-expansion');
    if (!expansionBar) return;

    // Hide all expansion buttons in this hunk
    const expansionButtons = expansionBar.querySelectorAll('.expansion-btn');
    expansionButtons.forEach(btn => {
        btn.style.display = 'none';
        if (DEBUG) console.log(`Hiding ${btn.dataset.direction} button`);
    });
}

function hideExpansionBarIfAllButtonsHidden(triggerButton) {
    // Find the specific expansion bar that contains the trigger button
    const expansionBar = triggerButton.closest('.hunk-expansion');
    if (!expansionBar) return;

    // Check if all expansion buttons in this specific expansion bar are hidden
    const expansionButtons = expansionBar.querySelectorAll('.expansion-btn');
    const buttonStates = Array.from(expansionButtons).map(btn => ({
        direction: btn.dataset.direction,
        display: btn.style.display,
        hidden: btn.style.display === 'none'
    }));

    if (DEBUG) console.log('Button states in expansion bar:', buttonStates);

    const allHidden = buttonStates.every(state => state.hidden);

    if (allHidden) {
        expansionBar.style.display = 'none';
        if (DEBUG) console.log('All expansion buttons hidden - hiding expansion bar');
    } else {
        if (DEBUG) console.log('Not all buttons hidden - keeping expansion bar visible');
    }
}

function checkAndMergeHunks(triggerButton) {
    // Get the current hunk element
    const context = hunkContext(triggerButton);
    if (!context?.fileElement) return;

    const { currentHunk, prevHunk, nextHunk } = context;
    const currentStart = parseInt(currentHunk.dataset.lineStart);
    const currentEnd = parseInt(currentHunk.dataset.lineEnd);

    // Check previous hunk for overlap
    if (prevHunk) {
        const prevEnd = parseInt(prevHunk.dataset.lineEnd);

        // If current hunk now overlaps or touches previous hunk
        if (currentStart <= prevEnd + 1) {
            if (DEBUG) console.log(`Hunk merge detected: previous hunk ends at ${prevEnd}, current starts at ${currentStart}`);
            mergeHunks(prevHunk, currentHunk);
            return; // Exit after merge to avoid further processing
        }
    }

    // Check next hunk for overlap
    if (nextHunk) {
        const nextStart = parseInt(nextHunk.dataset.lineStart);

        // If current hunk now overlaps or touches next hunk
        if (currentEnd >= nextStart - 1) {
            if (DEBUG) console.log(`Hunk merge detected: current hunk ends at ${currentEnd}, next starts at ${nextStart}`);
            mergeHunks(currentHunk, nextHunk);
        }
    }
}

function mergeHunks(firstHunk, secondHunk) {
    // Simple merge: hide the expansion bar of the second hunk
    // In a full implementation, we'd merge the actual content
    const secondExpansionBar = secondHunk.querySelector('.hunk-expansion');
    if (secondExpansionBar) {
        secondExpansionBar.style.display = 'none';
        if (DEBUG) console.log('Merged hunks - hiding second expansion bar');
    }

    // Update the line range of the first hunk to encompass both
    const firstStart = parseInt(firstHunk.dataset.lineStart);
    const firstEnd = parseInt(firstHunk.dataset.lineEnd);
    const secondStart = parseInt(secondHunk.dataset.lineStart);
    const secondEnd = parseInt(secondHunk.dataset.lineEnd);

    const mergedStart = Math.min(firstStart, secondStart);
    const mergedEnd = Math.max(firstEnd, secondEnd);

    firstHunk.dataset.lineStart = mergedStart;
    firstHunk.dataset.lineEnd = mergedEnd;

    if (DEBUG) console.log(`Merged hunk range: ${mergedStart}-${mergedEnd}`);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async() => {
    initializeTheme();
    await DiffState.init();

    // Apply initial state - state has already been restored in restoreState()
    setTimeout(() => {
        // Just ensure files not in expanded state are properly collapsed
        $$('[data-file]').forEach((fileElement) => {
            const filePath = fileElement.dataset.file;
            const contentElement = $(`[data-file-content="${filePath}"]`);
            const toggleIcon = fileElement.querySelector('.toggle-icon');

            if (contentElement && toggleIcon && !DiffState.expandedFiles.has(filePath)) {
                // Ensure non-expanded files are properly collapsed
                contentElement.style.display = 'none';
                toggleIcon.textContent = '▶';
                toggleIcon.dataset.expanded = 'false';
            }
        });

        // Ensure non-expanded groups are properly collapsed
        const allPossibleGroups = ['untracked', 'unstaged', 'staged', 'changes'];
        allPossibleGroups.forEach(groupKey => {
            if (!DiffState.expandedGroups.has(groupKey)) {
                const contentElement = $(`[data-group-content="${groupKey}"]`);
                const toggleIcon = $(`[data-group="${groupKey}"] .toggle-icon`);
                if (contentElement && toggleIcon) {
                    contentElement.style.display = 'none';
                    toggleIcon.textContent = '▶';
                    toggleIcon.dataset.expanded = 'false';
                }
            }
        });

        // Ensure all expansion buttons are enabled and functional
        if (DEBUG) console.log('Initializing expansion buttons...');
        $$('.expansion-btn').forEach((button, index) => {
            const targetStart = parseInt(button.dataset.targetStart);
            const targetEnd = parseInt(button.dataset.targetEnd);

            if (DEBUG) console.log(`Button ${index}: direction=${button.dataset.direction}, targetStart=${targetStart}, targetEnd=${targetEnd}`);

            // Ensure button is properly enabled
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.pointerEvents = 'auto';
            button.title = `Expand 10 lines ${button.dataset.direction} (${targetStart}-${targetEnd})`;

            if (DEBUG) console.log(`Button ${index} enabled and ready`);
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
window.toggleTheme = toggleTheme;
// This is just to shut up eslint. It triggers the no-unused-vars
// because it can't detect the usage because it's in the HTML in the
// onclick handler.
window.__loadFullDiff = loadFullDiff;

// Filename search helpers
// Helper kept minimal; currently not highlighting individual headers in filter mode

// Note: focusNextFilenameMatch removed in favor of live filtering

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSearchRegex(query) {
    const raw = (query || '').trim();
    if (!raw) return null;
    const tokens = raw.split(/\s+/).filter(Boolean).map(escapeRegExp);
    if (tokens.length === 0) return null;
    const pattern = tokens.join('.*');
    const hasUpper = /[A-Z]/.test(raw);
    const flags = hasUpper ? '' : 'i';
    try {
        return new RegExp(pattern, flags);
    } catch (_e) {
        // Fallback to literal, case-insensitive contains
        return null;
    }
}

function applyFilenameFilter(query) {
    const regex = buildSearchRegex(query);
    const lower = (query || '').toLowerCase();
    // Show/hide files
    let hiddenCount = 0;
    document.querySelectorAll('[data-file]').forEach(fileEl => {
        const headerNameEl = fileEl.querySelector('.file-header .font-mono');
        const name = headerNameEl ? (headerNameEl.textContent || '') : '';
        let matches;
        if (!query || query.length === 0) {
            matches = true;
        } else if (regex) {
            matches = regex.test(name);
        } else {
            // Fallback contains, case-insensitive
            matches = name.toLowerCase().includes(lower);
        }
        if (!matches) hiddenCount += 1;
        fileEl.style.display = matches ? '' : 'none';
        // Also hide associated content block to avoid large gaps
        const fileId = fileEl.getAttribute('data-file');
        const contentEl = document.querySelector(`[data-file-content="${CSS.escape(fileId)}"]`);
        if (contentEl) contentEl.style.display = matches ? contentEl.style.display : 'none';
    });

    // Hide groups with no visible files
    document.querySelectorAll('.diff-group').forEach(groupEl => {
        const anyVisible = groupEl.querySelector('[data-file]:not([style*="display: none"])');
        groupEl.style.display = anyVisible ? '' : 'none';
    });

    // Show hidden-count banner
    upsertHiddenBanner(hiddenCount);
}

function upsertHiddenBanner(hiddenCount) {
    // Prefer the banner spot in global controls
    const banner = document.getElementById('hidden-files-banner');
    if (!banner) return;
    if (hiddenCount > 0) {
        banner.textContent = `${hiddenCount} file${hiddenCount === 1 ? '' : 's'} hidden by search`;
        banner.style.display = '';
    } else {
        banner.style.display = 'none';
    }
}

/**
 * Load and display the complete diff for a file with unlimited context
 * @param {string} filePath - Path to the file
 * @param {string} fileId - Unique identifier for the file element
 */
async function loadFullDiff(filePath, fileId) {
    const expandIcon = document.getElementById(`expand-icon-${fileId}`);
    const fileContentElement = document.querySelector(`[data-file-content="${fileId}"]`);

    if (!expandIcon || !fileContentElement) {
        console.error('Full diff: Required elements not found');
        return;
    }

    // Get current diff parameters from URL or app state
    const urlParams = new URLSearchParams(window.location.search);
    const baseRef = urlParams.get('base_ref');
    const useHead = urlParams.get('use_head') === 'true';
    const useCached = urlParams.get('use_cached') === 'true';

    // Show loading state
    const originalIconContent = expandIcon.textContent;
    expandIcon.textContent = '⏳';
    expandIcon.style.pointerEvents = 'none';

    // Show loading indicator in content area
    fileContentElement.innerHTML = `
        <div class="p-8 text-center text-neutral-500">
            <div class="text-4xl mb-2">⏳</div>
            <p>Loading full diff...</p>
            <p class="text-sm">Fetching complete file comparison with unlimited context</p>
        </div>
    `;

    try {
        // Build API URL with parameters
        const apiUrl = new URL('/api/diff/full', window.location.origin);
        apiUrl.searchParams.set('file_path', filePath);
        if (baseRef) apiUrl.searchParams.set('base_ref', baseRef);
        if (useHead) apiUrl.searchParams.set('use_head', 'true');
        if (useCached) apiUrl.searchParams.set('use_cached', 'true');

        const response = await fetch(apiUrl.toString());
        const result = await response.json();

        if (result.status === 'ok') {
            if (result.has_changes) {
                await renderFullDiff(fileContentElement, result, fileId);

                // Hide the expand icon permanently
                expandIcon.style.display = 'none';
            } else {
                // No changes to show
                fileContentElement.innerHTML = `
                    <div class="p-8 text-center text-neutral-500">
                        <div class="text-4xl mb-2">✓</div>
                        <p>No changes in this file</p>
                        <p class="text-sm">${result.comparison_mode}</p>
                    </div>
                `;
            }
        } else {
            throw new Error(result.message || 'Failed to load full diff');
        }
    } catch (error) {
        console.error('Full diff error:', error);
        fileContentElement.innerHTML = `
            <div class="p-8 text-center text-danger-text-500">
                <div class="text-4xl mb-2">⚠️</div>
                <p class="font-medium">Failed to load full diff</p>
                <p class="text-sm mt-2">${escapeHtml(error.message)}</p>
                <p class="text-xs mt-4 text-neutral-400">Check the browser console for more details</p>
                <button onclick="loadFullDiff('${filePath}', '${fileId}')"
                        class="mt-4 px-3 py-1 text-sm bg-danger-bg-100 text-danger-text-700 rounded hover:bg-danger-bg-200 transition-colors">
                    Retry
                </button>
            </div>
        `;
        // Reset icon state on error
        expandIcon.textContent = originalIconContent;
        expandIcon.style.pointerEvents = '';
    } finally {
        // Restore icon state if still in loading mode
        if (expandIcon.textContent === '⏳') {
            expandIcon.textContent = originalIconContent;
            expandIcon.style.pointerEvents = '';
        }
    }
}

/**
 * Render the full diff data into the file content element
 * @param {HTMLElement} contentElement - Container to render diff into
 * @param {Object} diffData - Full diff data from API
 * @param {string} fileId - File identifier
 */
async function renderFullDiff(contentElement, diffData, fileId) {
    // Add debug logging to understand what we receive
    console.log('Rendering full diff for', diffData.file_path);
    console.log('Diff data structure:', diffData);

    if (diffData.diff_data && diffData.diff_data.hunks && diffData.diff_data.hunks.length > 0) {
        console.log('Using parsed diff data with', diffData.diff_data.hunks.length, 'hunks');
        console.log('First hunk sample:', diffData.diff_data.hunks[0]);

        // Use parsed diff data to render side-by-side hunks
        let htmlContent = '';

        for (let i = 0; i < diffData.diff_data.hunks.length; i++) {
            const hunk = diffData.diff_data.hunks[i];
            console.log(`Hunk ${i} has ${hunk.lines?.length || 0} lines`);
            if (hunk.lines && hunk.lines.length > 0) {
                console.log(`First few lines of hunk ${i}:`, hunk.lines.slice(0, 3));
            }
            htmlContent += renderSideBySideHunk(hunk, diffData.file_path, i);
        }

        contentElement.innerHTML = htmlContent;
    } else if (diffData.diff_content && diffData.diff_content.trim()) {
        console.log('Using raw diff content fallback');
        // Render raw diff content with better formatting
        const lines = diffData.diff_content.split('\n');
        let htmlContent = `
            <div class="full-diff-container">
                <div class="full-diff-header bg-neutral-100 px-4 py-2 text-sm text-neutral-700 border-b">
                    <span class="font-medium">Full diff:</span> ${escapeHtml(diffData.comparison_mode)} (unlimited context)
                </div>
                <div class="full-diff-content">
        `;

        for (const line of lines) {
            if (line.startsWith('@@')) {
                // Hunk header
                htmlContent += `<div class="hunk-header bg-neutral-50 px-4 py-2 text-sm font-mono text-neutral-600 border-b border-neutral-200">${escapeHtml(line)}</div>`;
            } else if (line.startsWith('+')) {
                // Addition
                htmlContent += `<div class="diff-line addition bg-success-bg-50 border-l-4 border-success-bg-300 px-4 py-1 text-sm font-mono"><span class="text-success-text-600">+</span>${escapeHtml(line.substring(1))}</div>`;
            } else if (line.startsWith('-')) {
                // Deletion
                htmlContent += `<div class="diff-line deletion bg-danger-bg-50 border-l-4 border-danger-bg-300 px-4 py-1 text-sm font-mono"><span class="text-danger-text-600">-</span>${escapeHtml(line.substring(1))}</div>`;
            } else if (line.startsWith(' ') || line === '') {
                // Context line
                htmlContent += `<div class="diff-line context bg-white px-4 py-1 text-sm font-mono"><span class="text-neutral-400"> </span>${escapeHtml(line.substring(1) || '')}</div>`;
            } else if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('+++') || line.startsWith('---')) {
                // File header lines - skip or style differently
                htmlContent += `<div class="file-header-line text-xs text-neutral-500 px-4 py-1 font-mono bg-neutral-25">${escapeHtml(line)}</div>`;
            } else {
                // Other lines
                htmlContent += `<div class="diff-line other px-4 py-1 text-sm font-mono text-neutral-600">${escapeHtml(line)}</div>`;
            }
        }

        htmlContent += `
                </div>
            </div>
        `;

        contentElement.innerHTML = htmlContent;
    } else {
        console.log('No diff content available');
        // No diff content available
        contentElement.innerHTML = `
            <div class="p-8 text-center text-neutral-500">
                <div class="text-4xl mb-2">📄</div>
                <p>No diff content available</p>
                <p class="text-sm">The full diff is empty or could not be processed.</p>
                <p class="text-xs mt-2 text-neutral-400">Comparison: ${escapeHtml(diffData.comparison_mode || 'unknown')}</p>
            </div>
        `;
    }
}

/**
 * Check if content appears to be syntax-highlighted HTML
 * @param {string} content - Content to check
 * @returns {boolean} True if content appears to be HTML
 */
function isHighlightedContent(content) {
    // Check for HTML tags or entities that indicate syntax highlighting
    return content && (
        content.includes('<span') ||
        content.includes('</span>') ||
        content.includes('&nbsp;') ||
        content.includes('&lt;') ||
        content.includes('&gt;') ||
        content.includes('&amp;') ||
        content.includes('<code>') ||
        content.includes('<em>') ||
        content.includes('<strong>')
    );
}

/**
 * Create HTML for a single diff hunk in side-by-side format
 * @param {Object} hunk - Hunk data from the diff parser
 * @param {string} filePath - File path
 * @param {number} hunkIndex - Hunk index
 * @returns {string} HTML string
 */
function renderSideBySideHunk(hunk, filePath, hunkIndex) {
    console.log('Rendering hunk', hunkIndex, 'with', hunk.lines?.length || 0, 'lines');

    // Debug: show line types for first few lines
    if (hunk.lines && hunk.lines.length > 0) {
        const sampleLines = hunk.lines.slice(0, 5);
        console.log('Sample line types:', sampleLines.map(l => ({ type: l.type, hasLeft: !!l.left, hasRight: !!l.right, leftContent: l.left?.content?.substring(0, 20), rightContent: l.right?.content?.substring(0, 20) })));
    }

    let html = `
        <div class="hunk border-b border-neutral-100 last:border-b-0">
            <!-- Hunk Lines -->
            <div class="hunk-lines font-mono text-xs">
    `;

    if (hunk.lines && Array.isArray(hunk.lines)) {
        for (const line of hunk.lines) {
            html += renderSideBySideLine(line);
        }
    } else {
        console.warn('Hunk has no lines array:', hunk);
        html += '<div class="p-4 text-center text-neutral-500">No line data available for this hunk</div>';
    }

    html += `
            </div>
        </div>
    `;

    return html;
}

/**
 * Render a single line in side-by-side format
 * @param {Object} line - Line data from diff parser
 * @returns {string} HTML string
 */
function renderSideBySideLine(line) {
    // Handle the complex line structure that the diff parser creates
    // The line might have 'left' and 'right' properties for side-by-side view

    let leftContent = '';
    let rightContent = '';
    let leftLineNum = '';
    let rightLineNum = '';
    let leftBg = 'bg-white';
    let rightBg = 'bg-white';

    if (line.type === 'context') {
        // Context line appears on both sides
        leftContent = line.left?.content || '';
        rightContent = line.right?.content || '';
        leftLineNum = line.left?.line_num || '';
        rightLineNum = line.right?.line_num || '';
        leftBg = 'bg-neutral-25';
        rightBg = 'bg-neutral-25';
    } else if (line.left && line.right) {
        // Changed line - deletion on left, addition on right
        leftContent = line.left.content || '';
        rightContent = line.right.content || '';
        leftLineNum = line.left.line_num || '';
        rightLineNum = line.right.line_num || '';
        leftBg = 'bg-danger-bg-50';
        rightBg = 'bg-success-bg-50';
    } else if (line.left) {
        // Deletion only
        leftContent = line.left.content || '';
        leftLineNum = line.left.line_num || '';
        leftBg = 'bg-red-50';
    } else if (line.right) {
        // Addition only
        rightContent = line.right.content || '';
        rightLineNum = line.right.line_num || '';
        rightBg = 'bg-success-bg-50';
    } else {
        // Simple line structure
        if (line.type === 'addition') {
            rightContent = line.content || '';
            rightLineNum = line.new_line_number || '';
            rightBg = 'bg-success-bg-50';
        } else if (line.type === 'deletion') {
            leftContent = line.content || '';
            leftLineNum = line.old_line_number || '';
            leftBg = 'bg-danger-bg-50';
        } else {
            leftContent = rightContent = line.content || '';
            leftLineNum = line.old_line_number || '';
            rightLineNum = line.new_line_number || '';
        }
    }

    return `
        <div class="diff-line grid grid-cols-2 border-b border-gray-50 hover:bg-neutral-25 line-${line.type || 'context'}">
            <!-- Left Side (Before) -->
            <div class="line-left border-r border-neutral-200 ${leftBg}">
                <div class="flex">
                    <div class="line-num w-12 px-2 py-1 text-neutral-400 text-right bg-neutral-50 border-r border-neutral-200 select-none">
                        ${leftLineNum ? `<span>${leftLineNum}</span>` : ''}
                    </div>
                    <div class="line-content flex-1 px-2 py-1 overflow-x-auto">
                        ${leftContent
        ? (leftBg.includes('danger') ? `<span class="text-danger-text-600">-</span><span>${isHighlightedContent(leftContent) ? leftContent : escapeHtml(leftContent)}</span>` : `<span class="text-neutral-400">&nbsp;</span><span>${isHighlightedContent(leftContent) ? leftContent : escapeHtml(leftContent)}</span>`)
        : ''}
                    </div>
                </div>
            </div>

            <!-- Right Side (After) -->
            <div class="line-right ${rightBg}">
                <div class="flex">
                    <div class="line-num w-12 px-2 py-1 text-neutral-400 text-right bg-neutral-50 border-r border-neutral-200 select-none">
                        ${rightLineNum ? `<span>${rightLineNum}</span>` : ''}
                    </div>
                    <div class="line-content flex-1 px-2 py-1 overflow-x-auto">
                        ${rightContent
        ? (rightBg.includes('success') ? `<span class="text-success-text-600">+</span><span>${isHighlightedContent(rightContent) ? rightContent : escapeHtml(rightContent)}</span>` : `<span class="text-neutral-400">&nbsp;</span><span>${isHighlightedContent(rightContent) ? rightContent : escapeHtml(rightContent)}</span>`)
        : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Theme switching functionality
function toggleTheme() {
    const htmlElement = document.documentElement;
    const isDark = htmlElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';

    if (isDark) {
        htmlElement.removeAttribute('data-theme');
    } else {
        htmlElement.setAttribute('data-theme', 'dark');
    }

    DiffState.theme = newTheme;

    // Update theme icon
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }

    // Save theme preference
    localStorage.setItem('difflicious-theme', newTheme);

    if (DEBUG) console.log(`Theme switched to ${newTheme}`);

    // Prevent any form submission or navigation
    return false;
}

// Initialize theme on load
function initializeTheme() {
    const savedTheme = localStorage.getItem('difflicious-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const defaultTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

    if (defaultTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    } else {
        document.documentElement.removeAttribute('data-theme');
    }

    DiffState.theme = defaultTheme;

    // Update theme icon
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.textContent = defaultTheme === 'dark' ? '☀️' : '🌙';
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('difflicious-theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            if (newTheme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
            DiffState.theme = newTheme;
            if (themeIcon) {
                themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
            }
        }
    });
}
