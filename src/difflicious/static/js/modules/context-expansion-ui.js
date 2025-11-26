/**
 * Context expansion UI logic
 * Handles HTML generation and DOM manipulation for expanded context
 */

import { $, escapeHtml } from './dom-utils.js';
import { hunkContext } from './hunk-operations.js';

// Debug toggle - can be overridden by main.js
let DEBUG = false;

export function setDebug(value) {
    DEBUG = value;
}

/**
 * Inject Pygments CSS styles into the document head
 * @param {string} cssStyles - CSS styles from Pygments
 */
export function injectPygmentsCss(cssStyles) {
    // Inject Pygments CSS styles into the document head if not already present
    if (!cssStyles) return;

    // Check if Pygments styles are already injected
    if ($('#pygments-styles')) return;

    const styleElement = document.createElement('style');
    styleElement.id = 'pygments-styles';
    styleElement.textContent = cssStyles;
    document.head.appendChild(styleElement);
}

/**
 * Create HTML for Pygments-formatted expanded context lines
 * @param {Object} result - API response with highlighted lines
 * @param {string} expansionId - Unique ID for this expansion
 * @param {HTMLElement} triggerButton - Button that triggered expansion
 * @param {string} direction - Expansion direction ('before' or 'after')
 * @returns {string} HTML string
 */
export function createExpandedContextHtml(result, expansionId, triggerButton, direction) {
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

    let html = `<div id="${expansionId}" class="expanded-context">`;

    lines.forEach((lineData, index) => {
        const lineNumRight = startLineNumRight + index;
        const lineNumLeft = startLineNumLeft + index;
        const content = lineData.highlighted_content || lineData.content || '';

        html += `
        <div class="diff-line grid grid-cols-2 hover:bg-neutral-25 line-context">
            <!-- Left Side (Before) -->
            <div class="line-left border-r border-neutral-200 dark:border-neutral-600">
                <div class="flex">
                    <div class="line-num w-12 px-2 py-1 text-neutral-400 text-right border-r border-neutral-200 dark:border-neutral-600 select-none">
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
                    <div class="line-num w-12 px-2 py-1 text-neutral-400 text-right border-r border-neutral-200 dark:border-neutral-600 select-none">
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

/**
 * Create HTML for plain text expanded context lines
 * @param {Object} result - API response with plain text lines
 * @param {string} expansionId - Unique ID for this expansion
 * @param {HTMLElement} triggerButton - Button that triggered expansion
 * @param {string} direction - Expansion direction ('before' or 'after')
 * @returns {string} HTML string
 */
export function createPlainContextHtml(result, expansionId, triggerButton, direction) {
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

    // Use imported escapeHtml from dom-utils.js
    let html = `<div id="${expansionId}" class="expanded-context">`;

    lines.forEach((line, index) => {
        const lineNumRight = startLineNumRight + index;
        const lineNumLeft = startLineNumLeft + index;
        const content = escapeHtml(line || '');

        html += `
        <div class="diff-line grid grid-cols-2 hover:bg-neutral-25 line-context">
            <!-- Left Side (Before) -->
            <div class="line-left border-r border-neutral-200 dark:border-neutral-600">
                <div class="flex">
                    <div class="line-num w-12 px-2 py-1 text-neutral-400 text-right border-r border-neutral-200 dark:border-neutral-600 select-none">
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
                    <div class="line-num w-12 px-2 py-1 text-neutral-400 text-right border-r border-neutral-200 dark:border-neutral-600 select-none">
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

/**
 * Insert expanded context HTML into the DOM
 * @param {HTMLElement} button - Button that triggered expansion
 * @param {string} filePath - File path
 * @param {number} hunkIndex - Hunk index
 * @param {string} direction - Expansion direction ('before' or 'after')
 * @param {string} expandedHtml - HTML to insert
 */
export function insertExpandedContext(button, filePath, hunkIndex, direction, expandedHtml) {
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

/**
 * Update hunk-lines data attributes after expansion
 * @param {HTMLElement} button - Expansion button
 * @param {string} direction - Expansion direction
 * @param {number} linesAdded - Number of lines added
 */
export function updateHunkLinesDataAttributes(button, direction, linesAdded) {
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
