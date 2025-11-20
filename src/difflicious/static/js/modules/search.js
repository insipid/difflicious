/**
 * File search and filtering functionality
 * Handles filename filtering and search regex building
 */

import { escapeRegExp } from './dom-utils.js';

/**
 * Build a search regex from a query string
 * Supports multi-word fuzzy matching and case sensitivity
 * @param {string} query - Search query
 * @returns {RegExp|null} Compiled regex or null if query is invalid
 */
export function buildSearchRegex(query) {
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

/**
 * Apply filename filter to all files in the diff
 * @param {string} query - Search query
 */
export function applyFilenameFilter(query) {
    const regex = buildSearchRegex(query);
    const lower = (query || '').toLowerCase();
    const fileElements = document.querySelectorAll('[data-file]');
    const contentElementsMap = new Map();

    // Pre-cache content elements to avoid repeated queries
    document.querySelectorAll('[data-file-content]').forEach(contentEl => {
        const fileId = contentEl.getAttribute('data-file-content');
        if (fileId) {
            contentElementsMap.set(fileId, contentEl);
        }
    });

    // Show/hide files
    let hiddenCount = 0;
    const fileUpdates = [];
    fileElements.forEach(fileEl => {
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

        const fileId = fileEl.getAttribute('data-file');
        const contentEl = contentElementsMap.get(fileId);
        const currentContentDisplay = contentEl ? contentEl.style.display : '';

        fileUpdates.push({
            fileEl,
            contentEl,
            matches,
            currentContentDisplay
        });
    });

    // Batch DOM updates for better performance
    requestAnimationFrame(() => {
        fileUpdates.forEach(({ fileEl, contentEl, matches, currentContentDisplay }) => {
            fileEl.style.display = matches ? '' : 'none';
            // Also hide associated content block to avoid large gaps
            if (contentEl) {
                contentEl.style.display = matches ? currentContentDisplay : 'none';
            }
        });
    });

    // Hide groups with no visible files
    requestAnimationFrame(() => {
        document.querySelectorAll('[data-group]').forEach(groupEl => {
            const anyVisible = groupEl.querySelector('[data-file]:not([style*="display: none"])');
            groupEl.style.display = anyVisible ? '' : 'none';
        });
    });

    // Show hidden-count banner
    upsertHiddenBanner(hiddenCount);
}

/**
 * Update or create the hidden files banner
 * @param {number} hiddenCount - Number of files hidden by search
 */
export function upsertHiddenBanner(hiddenCount) {
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
