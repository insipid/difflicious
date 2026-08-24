/**
 * Toolbar Alpine component
 *
 * Form submission hygiene only. Group visibility moved to the filters store when
 * the Unstaged/Untracked toggles moved out of the toolbar and into the scrolling
 * controls row.
 */

/**
 * @returns {object} Alpine component object
 */
export function toolbarComponent() {
    return {
        scrubEmptySearch(form) {
            const searchInput = form.querySelector('input[name="search"]');
            if (searchInput && (!searchInput.value || searchInput.value.trim() === '')) {
                searchInput.name = '';
            }
        }
    };
}

if (typeof window !== 'undefined') {
    window.toolbarComponent = toolbarComponent;
}
