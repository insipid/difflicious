/**
 * Filters store
 *
 * Which change groups are shown: unstaged and untracked. This lives in a store
 * rather than a component because the controls sit in the scrolling content
 * while the state is read elsewhere; component-local state would have tied it
 * to one position in the markup.
 */

export default {
    unstaged: true,
    untracked: true,

    /**
     * Seed from the server-rendered state.
     * @param {boolean} unstaged - Initial unstaged visibility
     * @param {boolean} untracked - Initial untracked visibility
     */
    init(unstaged, untracked) {
        this.unstaged = unstaged;
        this.untracked = untracked;
        this.applyVisibility();
        // Runs after Alpine has applied x-show, so this is the first point at
        // which the visible file list is accurate.
        if (window.Alpine?.store('nav')) window.Alpine.store('nav').rebuild();
    },

    /**
     * Toggle one group and persist the choice to the URL.
     * @param {string} name - Either 'unstaged' or 'untracked'
     * @param {boolean} checked - New state
     */
    toggle(name, checked) {
        this[name] = checked;
        this.applyVisibility();
        this.persistToURL();
        // The file dropdown lists only visible files, so it has to follow.
        if (window.Alpine?.store('nav')) window.Alpine.store('nav').rebuild();
    },

    applyVisibility() {
        const groups = { unstaged: this.unstaged, untracked: this.untracked };
        Object.entries(groups).forEach(([name, visible]) => {
            const el = document.querySelector(`[data-group="${name}"]`);
            if (el) el.style.display = visible ? '' : 'none';
        });
    },

    /**
     * Keep the URL shareable without reloading the page.
     */
    persistToURL() {
        const url = new URL(window.location.href);
        url.searchParams.set('unstaged', this.unstaged.toString());
        url.searchParams.set('untracked', this.untracked.toString());
        window.history.replaceState({}, '', url);
    }
};
