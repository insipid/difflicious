/**
 * Full diff loading and rendering functionality
 * Handles loading complete file diffs with unlimited context
 */

import { escapeHtml, isHighlightedContent } from './dom-utils.js';

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
                <button onclick="loadFullDiff('${escapeJsString(filePath)}', '${escapeJsString(fileId)}')"
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
        leftBg = 'bg-danger-bg-50';
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
