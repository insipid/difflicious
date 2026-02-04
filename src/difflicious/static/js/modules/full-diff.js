/**
 * Full diff loading and rendering functionality
 * Handles loading complete file diffs with unlimited context
 */

import { escapeHtml, escapeJsString, isHighlightedContent } from './dom-utils.js';
import {
    actionButton,
    diffLine,
    diffSide,
    lineContent,
    lineNum,
    statusCaption,
    statusPanel
} from './design-system.js';

/**
 * Load and display content for a moved/renamed file with no changes.
 * Shows the file content as unchanged (context lines) on both sides.
 * @param {HTMLElement} button - The button that triggered the load
 */
export async function loadMovedFileContent(button) {
    const container = button.closest('.moved-file-content');
    if (!container) {
        console.error('loadMovedFileContent: Could not find container');
        return;
    }

    const filePath = container.dataset.filePath;
    if (!filePath) {
        console.error('loadMovedFileContent: No file path found');
        return;
    }

    // Show loading state
    container.innerHTML = `
        <div class="p-4 text-center text-neutral-500">
            <div class="text-2xl mb-2">⏳</div>
            <p class="text-sm">Loading file content...</p>
        </div>
    `;

    try {
        // Fetch the file content in chunks (API has a 100-line limit per request)
        const CHUNK_SIZE = 100;
        let allLines = [];
        let startLine = 1;
        let hasMore = true;

        while (hasMore) {
            const apiUrl = new URL('/api/file/lines', window.location.origin);
            apiUrl.searchParams.set('file_path', filePath);
            apiUrl.searchParams.set('start_line', String(startLine));
            apiUrl.searchParams.set('end_line', String(startLine + CHUNK_SIZE - 1));

            const response = await fetch(apiUrl.toString());
            const result = await response.json();

            if (!response.ok || result.status !== 'ok') {
                throw new Error(result.message || 'Failed to load file lines');
            }

            const chunk = result.lines || [];
            allLines = allLines.concat(chunk);

            if (chunk.length < CHUNK_SIZE) {
                hasMore = false;
            } else {
                startLine += CHUNK_SIZE;
            }
        }

        const lines = allLines;
        if (lines.length === 0) {
            container.innerHTML = `
                <div class="p-4 text-center text-neutral-500">
                    <div class="text-2xl mb-2">📄</div>
                    <p class="text-sm">File is empty</p>
                </div>
            `;
            return;
        }

        // Render the content as unchanged lines on both sides
        let html = '<div class="moved-file-lines font-mono text-xs">';

        lines.forEach((line, index) => {
            const lineNum = index + 1;
            const content = escapeHtml(line);

            html += `
            <div class="diff-line grid grid-cols-2 hover:bg-neutral-25 line-context">
                <!-- Left Side (Before) -->
                <div class="line-left border-r border-neutral-200 dark:border-neutral-600">
                    <div class="flex">
                        <div class="line-num w-12 px-2 py-1 text-neutral-400 text-right border-r border-neutral-200 dark:border-neutral-600 select-none">
                            <span>${lineNum}</span>
                        </div>
                        <div class="line-content flex-1 px-2 py-1 overflow-x-auto min-w-0">
                            <span class="text-neutral-400">&nbsp;</span>
                            <span class="highlight break-words">${content}</span>
                        </div>
                    </div>
                </div>
                <!-- Right Side (After) -->
                <div class="line-right">
                    <div class="flex">
                        <div class="line-num w-12 px-2 py-1 text-neutral-400 text-right border-r border-neutral-200 dark:border-neutral-600 select-none">
                            <span>${lineNum}</span>
                        </div>
                        <div class="line-content flex-1 px-2 py-1 overflow-x-auto min-w-0">
                            <span class="text-neutral-400">&nbsp;</span>
                            <span class="highlight break-words">${content}</span>
                        </div>
                    </div>
                </div>
            </div>`;
        });

        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('loadMovedFileContent error:', error);
        container.innerHTML = `
            <div class="p-4 text-center text-danger-text-500">
                <div class="text-2xl mb-2">⚠️</div>
                <p class="text-sm">Failed to load file content</p>
                <p class="text-xs mt-1">${escapeHtml(error.message)}</p>
            </div>
        `;
    }
}

/**
 * Load and display the complete diff for a file with unlimited context
 * @param {string} filePath - Path to the file
 * @param {string} fileId - Unique identifier for the file element
 */
export async function loadFullDiff(filePath, fileId) {
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
        <div class="${statusPanel()}">
            <div class="text-4xl mb-2">⏳</div>
            <p>Loading full diff...</p>
            <p class="${statusCaption()}">Fetching complete file comparison with unlimited context</p>
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
                    <div class="${statusPanel()}">
                        <div class="text-4xl mb-2">✓</div>
                        <p>No changes in this file</p>
                        <p class="${statusCaption()}">${result.comparison_mode}</p>
                    </div>
                `;
            }
        } else {
            throw new Error(result.message || 'Failed to load full diff');
        }
    } catch (error) {
        console.error('Full diff error:', error);
        fileContentElement.innerHTML = `
            <div class="${statusPanel({ tone: 'danger' })}">
                <div class="text-4xl mb-2">⚠️</div>
                <p class="font-medium">Failed to load full diff</p>
                <p class="text-sm mt-2">${escapeHtml(error.message)}</p>
                <p class="text-xs mt-4 text-neutral-400">Check the browser console for more details</p>
                <button onclick="loadFullDiff('${escapeJsString(filePath)}', '${escapeJsString(fileId)}')"
                        class="${actionButton({ intent: 'danger' })}">
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
export async function renderFullDiff(contentElement, diffData, fileId) {
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
            <div class="${statusPanel()}">
                <div class="text-4xl mb-2">📄</div>
                <p>No diff content available</p>
                <p class="${statusCaption()}">The full diff is empty or could not be processed.</p>
                <p class="text-xs mt-2 text-neutral-400">Comparison: ${escapeHtml(diffData.comparison_mode || 'unknown')}</p>
            </div>
        `;
    }
}

/**
 * Create HTML for a single diff hunk in side-by-side format
 * @param {Object} hunk - Hunk data from the diff parser
 * @param {string} filePath - File path
 * @param {number} hunkIndex - Hunk index
 * @returns {string} HTML string
 */
export function renderSideBySideHunk(hunk, filePath, hunkIndex) {
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
export function renderSideBySideLine(line) {
    // Handle the complex line structure that the diff parser creates
    // The line might have 'left' and 'right' properties for side-by-side view

    let leftContent = '';
    let rightContent = '';
    let leftLineNum = '';
    let rightLineNum = '';
    let leftBg = 'default';
    let rightBg = 'default';

    if (line.type === 'context') {
        // Context line appears on both sides
        leftContent = line.left?.content || '';
        rightContent = line.right?.content || '';
        leftLineNum = line.left?.line_num || '';
        rightLineNum = line.right?.line_num || '';
        leftBg = 'context';
        rightBg = 'context';
    } else if (line.left && line.right) {
        // Changed line - deletion on left, addition on right
        leftContent = line.left.content || '';
        rightContent = line.right.content || '';
        leftLineNum = line.left.line_num || '';
        rightLineNum = line.right.line_num || '';
        leftBg = 'deletion';
        rightBg = 'addition';
    } else if (line.left) {
        // Deletion only
        leftContent = line.left.content || '';
        leftLineNum = line.left.line_num || '';
        leftBg = 'deletion';
    } else if (line.right) {
        // Addition only
        rightContent = line.right.content || '';
        rightLineNum = line.right.line_num || '';
        rightBg = 'addition';
    } else {
        // Simple line structure
        if (line.type === 'addition') {
            rightContent = line.content || '';
            rightLineNum = line.new_line_number || '';
            rightBg = 'addition';
        } else if (line.type === 'deletion') {
            leftContent = line.content || '';
            leftLineNum = line.old_line_number || '';
            leftBg = 'deletion';
        } else {
            leftContent = rightContent = line.content || '';
            leftLineNum = line.old_line_number || '';
            rightLineNum = line.new_line_number || '';
        }
    }

    return `
        <div class="${diffLine({ tone: line.type || 'context', border: 'subtle', className: `line-${line.type || 'context'}` })}">
            <!-- Left Side (Before) -->
            <div class="${diffSide({ side: 'left', border: 'divider', background: leftBg })}">
                <div class="flex">
                    <div class="${lineNum({ background: 'neutral' })}">
                        ${leftLineNum ? `<span>${leftLineNum}</span>` : ''}
                    </div>
                    <div class="${lineContent()}">
                        ${leftContent
        ? (leftBg === 'deletion' ? `<span class="text-danger-text-600">-</span><span>${isHighlightedContent(leftContent) ? leftContent : escapeHtml(leftContent)}</span>` : `<span class="text-neutral-400">&nbsp;</span><span>${isHighlightedContent(leftContent) ? leftContent : escapeHtml(leftContent)}</span>`)
        : ''}
                    </div>
                </div>
            </div>

            <!-- Right Side (After) -->
            <div class="${diffSide({ side: 'right', background: rightBg })}">
                <div class="flex">
                    <div class="${lineNum({ background: 'neutral' })}">
                        ${rightLineNum ? `<span>${rightLineNum}</span>` : ''}
                    </div>
                    <div class="${lineContent()}">
                        ${rightContent
        ? (rightBg === 'addition' ? `<span class="text-success-text-600">+</span><span>${isHighlightedContent(rightContent) ? rightContent : escapeHtml(rightContent)}</span>` : `<span class="text-neutral-400">&nbsp;</span><span>${isHighlightedContent(rightContent) ? rightContent : escapeHtml(rightContent)}</span>`)
        : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
}
