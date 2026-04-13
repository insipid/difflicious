/**
 * Toolbar Alpine component
 * Manages client-side visibility of unstaged/untracked groups
 * and form submission hygiene. Extracted from toolbar.html inline script.
 */

/**
 * @param {boolean} initialUnstaged - Server-rendered initial unstaged toggle state
 * @param {boolean} initialUntracked - Server-rendered initial untracked toggle state
 * @returns {object} Alpine component object
 */
export function toolbarComponent(initialUnstaged, initialUntracked) {
    return {
        unstaged: initialUnstaged,
        untracked: initialUntracked,

        init() {
            this.updateGroupVisibility();
        },

        updateToggle(name, checked) {
            this[name] = checked;
            this.updateGroupVisibility();
            this.updateURL();
        },

        updateGroupVisibility() {
            const unstagedGroup = document.querySelector('[data-group="unstaged"]');
            const untrackedGroup = document.querySelector('[data-group="untracked"]');
            if (unstagedGroup) unstagedGroup.style.display = this.unstaged ? '' : 'none';
            if (untrackedGroup) untrackedGroup.style.display = this.untracked ? '' : 'none';
        },

        updateURL() {
            const url = new URL(window.location.href);
            url.searchParams.set('unstaged', this.unstaged.toString());
            url.searchParams.set('untracked', this.untracked.toString());
            window.history.replaceState({}, '', url);
        },

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
