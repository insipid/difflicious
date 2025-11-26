/**
 * File and group toggle operations
 * Handles expansion/collapse of individual files and groups
 */

import { $, $$ } from './dom-utils.js';
import { DiffState } from './state.js';

/**
 * Toggle the expansion state of a single file
 * @param {string} filePath - Path to the file
 */
export function toggleFile(filePath) {
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

/**
 * Toggle the expansion state of a file group
 * @param {string} groupKey - Group identifier (e.g., 'staged', 'unstaged')
 */
export function toggleGroup(groupKey) {
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

/**
 * Expand all files in the diff
 * Optimized for bulk operations - bypasses Alpine transitions
 */
export function expandAllFiles() {
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
                // Directly set display to bypass Alpine transitions
                contentElement.style.display = 'block';
                if (toggleIcon) {
                    toggleIcon.textContent = '▼';
                    toggleIcon.dataset.expanded = 'true';
                }
            });
        });

        // Update internal state in batch
        filesToAdd.forEach(filePath => DiffState.expandedFiles.add(filePath));

        // Sync with Alpine store if available
        if (window.Alpine && window.Alpine.store('diff')) {
            window.Alpine.store('diff').expandAll(filesToAdd);
        }

        // Save state once after all changes
        DiffState.saveState();
    }
}

/**
 * Collapse all files in the diff
 * Optimized for bulk operations - bypasses Alpine transitions
 */
export function collapseAllFiles() {
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
                // Directly set display to bypass Alpine transitions
                contentElement.style.display = 'none';
                if (toggleIcon) {
                    toggleIcon.textContent = '▶';
                    toggleIcon.dataset.expanded = 'false';
                }
            });
        });

        // Update internal state in batch
        filesToRemove.forEach(filePath => DiffState.expandedFiles.delete(filePath));

        // Sync with Alpine store if available
        if (window.Alpine && window.Alpine.store('diff')) {
            window.Alpine.store('diff').collapseAll();
        }

        // Save state once after all changes
        DiffState.saveState();
    }
}
