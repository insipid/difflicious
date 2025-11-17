/**
 * Context expansion functionality
 * Handles API calls and coordination for expanding diff context
 */

import {
    injectPygmentsCss,
    createExpandedContextHtml,
    createPlainContextHtml,
    insertExpandedContext,
    updateHunkLinesDataAttributes
} from './context-expansion-ui.js';
import { handlePostExpansionLogic, hunkContext } from './hunk-operations.js';

// Debug toggle - can be overridden by main.js
let DEBUG = false;

export function setDebug(value) {
    DEBUG = value;
}

/**
 * Update hunk range after expansion
 * @param {HTMLElement} button - Expansion button
 * @param {number} targetStart - Start line number
 * @param {number} targetEnd - End line number
 */
export function updateHunkRangeAfterExpansion(button, targetStart, targetEnd) {
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

/**
 * Determine expansion direction from button dataset
 * @param {HTMLElement} button - Expansion button
 * @returns {string} Direction ('before' or 'after')
 */
function directionFromButton(button) {
    const d = (button?.dataset?.direction || '').toLowerCase();
    return d === 'after' ? 'after' : 'before';
}

/**
 * Expand context around a diff hunk
 * @param {HTMLElement} button - Expansion button element
 * @param {string} filePath - Path to the file
 * @param {number} hunkIndex - Index of the hunk
 * @param {string} direction - Expansion direction ('before' or 'after')
 * @param {number} contextLines - Number of context lines to expand (default: 10)
 * @param {string} format - Format for expansion ('pygments' or 'plain', default: 'pygments')
 */
export async function expandContext(button, filePath, hunkIndex, direction, contextLines = 10, format = 'pygments') {
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

            // Update hunk range data to include the expanded lines
            updateHunkRangeAfterExpansion(button, targetStart, targetEnd);

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
