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
async function expandContext(button, filePath, hunkIndex, direction, contextLines = 10, format = 'pygments') {
    console.log(`🔥 expandContext called! File: ${filePath}, Direction: ${direction}, Range: ${button.dataset.targetStart}-${button.dataset.targetEnd}`);

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
            console.log(`Context expansion successful for ${filePath}, format: ${result.format}`);

            // Handle format-specific processing
            let expandedHtml;
            if (format === 'pygments' && result.format === 'pygments') {
                console.log(`Injecting Pygments CSS and creating HTML for ${result.lines.length} lines`);
                injectPygmentsCss(result.css_styles);
                expandedHtml = createExpandedContextHtml(result, expansionId);
            } else {
                console.log(`Using plain format for ${result.lines.length} lines`);
                expandedHtml = createPlainContextHtml(result, expansionId);
            }

            // Insert the expanded context
            insertExpandedContext(button, filePath, hunkIndex, direction, expandedHtml);

            // Common post-processing logic
            handlePostExpansionLogic(button, result, contextLines, targetStart, targetEnd, direction, originalText);

            console.log(`Successfully inserted expanded context with ID: ${expansionId}`);
        } else {
            console.error('Context expansion failed:', result.message);
            button.textContent = originalText;
        }
    } catch (error) {
        console.error('Context expansion error:', error);
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
    console.log(`Hiding button. Target range: ${targetStart}-${targetEnd}`);

    // If this was an up button that reached line 1, hide all buttons (file fully expanded)
    if (direction === 'before' && targetStart === 1) {
        console.log('Up button reached line 1 - hiding all expansion buttons');
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
            console.log(`Beginning of file reached. Current targetStart was ${targetStart}. Hiding up buttons.`);
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
                    console.log('No room for expansion between hunks. Hiding up buttons.');
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
                console.log('No room for expansion between hunks. Hiding down buttons.');
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

function createExpandedContextHtml(result, expansionId) {
    // Create HTML for Pygments-formatted expanded context lines
    const lines = result.lines || [];
    const startLineNum = result.start_line || 1;

    let html = `<div id="${expansionId}" class="expanded-context bg-gray-25 border-l-2 border-gray-300">`;

    lines.forEach((lineData, index) => {
        const lineNum = startLineNum + index;
        const content = lineData.highlighted_content || lineData.content || '';

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
                        <span class="highlight">${content}</span>
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
    const startLineNum = result.start_line || 1;

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
    const context = hunkContext(button);
    if (!context) {
        console.error('Could not find hunk element for insertion');
        return;
    }

    // Find the hunk lines container within this specific hunk
    const { currentHunk } = context;
    const hunkLinesElement = currentHunk.querySelector('.hunk-lines');
    if (!hunkLinesElement) {
        console.error('Could not find hunk-lines element for insertion');
        return;
    }

    console.log('Found hunk-lines element, creating expanded content...');

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

    console.log('Successfully inserted expanded content into DOM');
}

// Range conflict detection and state management functions

function updateHunkRangeAfterExpansion(button, targetStart, targetEnd) {
    // Get the hunk element containing this button
    const context = hunkContext(button);
    if (!context) return;

    // Get current range
    const { currentHunk } = context;
    const currentStart = parseInt(currentHunk.dataset.lineStart);
    const currentEnd = parseInt(currentHunk.dataset.lineEnd);

    // Calculate new expanded range
    const newStart = Math.min(currentStart, targetStart);
    const newEnd = Math.max(currentEnd, targetEnd);

    // Update hunk data attributes
    currentHunk.dataset.lineStart = newStart;
    currentHunk.dataset.lineEnd = newEnd;

    console.log(`Updated hunk range from ${currentStart}-${currentEnd} to ${newStart}-${newEnd}`);
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
        console.log(`Hiding ${btn.dataset.direction} button`);
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

    console.log('Button states in expansion bar:', buttonStates);

    const allHidden = buttonStates.every(state => state.hidden);

    if (allHidden) {
        expansionBar.style.display = 'none';
        console.log('All expansion buttons hidden - hiding expansion bar');
    } else {
        console.log('Not all buttons hidden - keeping expansion bar visible');
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
            console.log(`Hunk merge detected: previous hunk ends at ${prevEnd}, current starts at ${currentStart}`);
            mergeHunks(prevHunk, currentHunk);
            return; // Exit after merge to avoid further processing
        }
    }

    // Check next hunk for overlap
    if (nextHunk) {
        const nextStart = parseInt(nextHunk.dataset.lineStart);

        // If current hunk now overlaps or touches next hunk
        if (currentEnd >= nextStart - 1) {
            console.log(`Hunk merge detected: current hunk ends at ${currentEnd}, next starts at ${nextStart}`);
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
        console.log('Merged hunks - hiding second expansion bar');
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

    console.log(`Merged hunk range: ${mergedStart}-${mergedEnd}`);
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

        // Ensure all expansion buttons are enabled and functional
        console.log('Initializing expansion buttons...');
        $$('.expansion-btn').forEach((button, index) => {
            const targetStart = parseInt(button.dataset.targetStart);
            const targetEnd = parseInt(button.dataset.targetEnd);

            console.log(`Button ${index}: direction=${button.dataset.direction}, targetStart=${targetStart}, targetEnd=${targetEnd}`);

            // Ensure button is properly enabled
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.pointerEvents = 'auto';
            button.title = `Expand 10 lines ${button.dataset.direction} (${targetStart}-${targetEnd})`;

            console.log(`Button ${index} enabled and ready`);
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
