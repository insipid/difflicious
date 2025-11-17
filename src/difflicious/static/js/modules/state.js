/**
 * State management for diff view
 * Handles file/group expansion state, persistence, and restoration
 */

import { $, $$ } from './dom-utils.js';
import { applyFilenameFilter } from './search.js';

// Debug toggle - can be overridden by main.js
let DEBUG = false;

export function setDebug(value) {
    DEBUG = value;
}

/**
 * Global state object for managing diff view state
 */
export const DiffState = {
    expandedFiles: new Set(),
    expandedGroups: new Set(['untracked', 'unstaged', 'staged']),
    repositoryName: null,
    storageKey: 'difflicious-state', // fallback key
    theme: 'light', // current theme

    /**
     * Initialize the diff state
     */
    async init() {
        await this.initializeRepository();
        this.bindEventListeners();
        this.restoreState();
        this.installSearchHotkeys();
        this.installLiveSearchFilter();
    },

    /**
     * Initialize repository name from API
     */
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

    /**
     * Bind global event listeners
     */
    bindEventListeners() {
        // Global expand/collapse buttons
        const expandAllBtn = $('#expandAll');
        const collapseAllBtn = $('#collapseAll');

        if (expandAllBtn) expandAllBtn.addEventListener('click', () => {
            // Import dynamically to avoid circular dependency
            import('./file-operations.js').then(module => module.expandAllFiles());
        });
        if (collapseAllBtn) collapseAllBtn.addEventListener('click', () => {
            // Import dynamically to avoid circular dependency
            import('./file-operations.js').then(module => module.collapseAllFiles());
        });

        // Form auto-submit on changes (but exclude unstaged/untracked toggles for client-side filtering)
        $$('input[type="checkbox"], select').forEach(input => {
            // Skip unstaged and untracked checkboxes - they use client-side filtering
            if (input.type === 'checkbox' && (input.name === 'unstaged' || input.name === 'untracked')) {
                return;
            }
            input.addEventListener('change', () => {
                input.closest('form')?.submit();
            });
        });
    },

    /**
     * Restore state from localStorage and server-rendered state
     */
    restoreState() {
        // Cache all file elements upfront to avoid repeated DOM queries
        const fileElementsMap = new Map();
        const fileContentElements = Array.from($$('[data-file-content]'));

        // Build a map of filePath -> { contentElement, fileElement, toggleIcon }
        fileContentElements.forEach(contentElement => {
            const filePath = contentElement.dataset.fileContent;
            if (filePath) {
                const fileElement = contentElement.closest('[data-file]') ||
                    document.querySelector(`[data-file="${CSS.escape(filePath)}"]`);
                const toggleIcon = fileElement?.querySelector('.toggle-icon');

                if (fileElement && toggleIcon) {
                    fileElementsMap.set(filePath, {
                        contentElement,
                        fileElement,
                        toggleIcon
                    });
                }
            }
        });

        // First, sync with server-rendered state by checking which files are initially visible
        // Check computed style to handle both inline styles and CSS classes
        const serverExpandedFiles = new Set();
        fileElementsMap.forEach((elements, filePath) => {
            const computedStyle = window.getComputedStyle(elements.contentElement);
            const isVisible = computedStyle.display !== 'none';
            if (isVisible) {
                serverExpandedFiles.add(filePath);
            }
        });

        // Then try to restore from localStorage if available
        const saved = localStorage.getItem(this.storageKey);
        let finalExpandedFiles;
        let finalExpandedGroups;

        if (saved) {
            try {
                const state = JSON.parse(saved);

                // Restore file expansion states
                if (state.expandedFiles) {
                    // Merge server state with localStorage state
                    // Server state (visible files) takes priority and should always be included
                    const savedExpandedFiles = new Set(state.expandedFiles);
                    finalExpandedFiles = new Set([...serverExpandedFiles, ...savedExpandedFiles]);
                } else {
                    // No saved files, just use server state
                    finalExpandedFiles = serverExpandedFiles;
                }

                // Restore group expansion states
                if (state.expandedGroups) {
                    finalExpandedGroups = new Set(state.expandedGroups);
                } else {
                    // Default expanded groups if no saved state
                    finalExpandedGroups = new Set(['untracked', 'unstaged', 'staged']);
                }

                if (DEBUG) console.log(`Restored state for ${this.repositoryName}:`, state);
            } catch (e) {
                if (DEBUG) console.warn('Failed to restore state:', e);
                // Use defaults on error, but preserve server state
                finalExpandedFiles = serverExpandedFiles;
                finalExpandedGroups = new Set(['untracked', 'unstaged', 'staged']);
            }
        } else {
            // No saved state, use server state and defaults
            finalExpandedFiles = serverExpandedFiles;
            finalExpandedGroups = new Set(['untracked', 'unstaged', 'staged']);
        }

        // Set the state
        this.expandedFiles = finalExpandedFiles;
        this.expandedGroups = finalExpandedGroups;

        // Apply visual state synchronously for initial load (don't defer with requestAnimationFrame)
        // Batch DOM updates for better performance, but apply immediately
        const fileUpdates = [];
        fileElementsMap.forEach((elements, filePath) => {
            const shouldBeExpanded = finalExpandedFiles.has(filePath);
            fileUpdates.push({
                elements,
                shouldBeExpanded
            });
        });

        // Apply file updates synchronously
        fileUpdates.forEach(({ elements, shouldBeExpanded }) => {
            elements.contentElement.style.display = shouldBeExpanded ? 'block' : 'none';
            elements.toggleIcon.textContent = shouldBeExpanded ? '▼' : '▶';
            elements.toggleIcon.dataset.expanded = shouldBeExpanded ? 'true' : 'false';
        });

        // Cache group elements upfront and apply updates
        const allPossibleGroups = ['untracked', 'unstaged', 'staged', 'changes'];
        allPossibleGroups.forEach(groupKey => {
            const contentElement = $(`[data-group-content="${groupKey}"]`);
            const groupElement = $(`[data-group="${groupKey}"]`);
            const toggleIcon = groupElement?.querySelector('.toggle-icon');

            if (contentElement && toggleIcon) {
                const shouldBeExpanded = finalExpandedGroups.has(groupKey);
                contentElement.style.display = shouldBeExpanded ? 'block' : 'none';
                toggleIcon.textContent = shouldBeExpanded ? '▼' : '▶';
                toggleIcon.dataset.expanded = shouldBeExpanded ? 'true' : 'false';
            }
        });
    },

    /**
     * Save current state to localStorage
     */
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

    /**
     * Install keyboard shortcuts for search
     */
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
                const clearBtn = $('#diff-search-clear');
                if (clearBtn) clearBtn.classList.add('hidden');
                active.blur();
            }

            // Enter no longer cycles results; filtering is live on input
        });
    },

    /**
     * Install live search filter on input
     */
    installLiveSearchFilter() {
        const searchInput = $('#diff-search-input');
        const clearBtn = $('#diff-search-clear');
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
