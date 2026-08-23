/**
 * Navigation store
 *
 * Backs the file dropdown and the jump-to-top / jump-to-bottom controls in the
 * pinned toolbar.
 *
 * The file list is built from the DOM rather than rendered server-side. The
 * order and visibility of files depend on the search filter and the group
 * toggles, both of which are applied client-side; reading the document is the
 * only way to stay in step with them without duplicating that logic.
 */

import { prefersReducedMotion, scrollToFile } from '../modules/navigation.js';

/** Files closer than this to the document end count as "at the bottom". */
const BOTTOM_EPSILON_PX = 2;

export default {
    files: [],
    currentFile: '',
    atTop: true,
    atBottom: false,

    init() {
        this.observeScrollPosition();

        // Stores initialise before Alpine walks the DOM, and until it has,
        // x-cloak keeps group content at display:none — so every file measures
        // as hidden and the list comes back empty. Take the first reading after
        // the browser has laid the page out. rebuild() is idempotent, so the
        // later triggers (filters, search) simply refresh it.
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => this.rebuild()));
    },

    /**
     * Rebuild the dropdown from the files currently rendered and visible.
     * Call after anything that shows or hides files.
     */
    rebuild() {
        this.files = Array.from(document.querySelectorAll('[data-file]'))
            .filter((el) => el.offsetParent !== null)
            .map((el) => ({
                id: el.dataset.file,
                label: el.dataset.file.replace(/^[^:]+:/, '')
            }));

        // A file that has just been filtered away must not stay selected.
        if (!this.files.some((f) => f.id === this.currentFile)) {
            this.currentFile = this.files.length ? this.files[0].id : '';
        }
        this.updateCurrentFile();
    },

    /**
     * Scroll a file to just below the toolbar.
     * @param {string} fileId - The data-file value of the target
     */
    jumpToFile(fileId) {
        const el = document.querySelector(`[data-file="${CSS.escape(fileId)}"]`);
        if (el) scrollToFile(el);
    },

    jumpToTop() {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    },

    jumpToBottom() {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: prefersReducedMotion() ? 'auto' : 'smooth'
        });
    },

    /**
     * Track whether the page is at either end, to disable the jump buttons.
     */
    observeScrollPosition() {
        let ticking = false;
        const update = () => {
            const doc = document.documentElement;
            const max = doc.scrollHeight - window.innerHeight;
            this.atTop = window.scrollY <= 0;
            this.atBottom = window.scrollY >= max - BOTTOM_EPSILON_PX;
            this.updateCurrentFile();
            ticking = false;
        };
        update();
        window.addEventListener('scroll', () => {
            if (!ticking) {
                ticking = true;
                window.requestAnimationFrame(update);
            }
        }, { passive: true });
        window.addEventListener('resize', update, { passive: true });
    },

    /**
     * The current file is the last one whose header has reached the toolbar —
     * i.e. the header currently pinned.
     *
     * An IntersectionObserver on a thin band below the toolbar looks cheaper,
     * but several headers can intersect it at once and the callback gives no
     * ordering, so the result was whichever entry happened to come last. This
     * scan is unambiguous, and it is only a handful of rect reads on scroll
     * frames that already do layout work.
     */
    updateCurrentFile() {
        const headers = Array.from(
            document.querySelectorAll('[data-file] .file-header-wrapper')
        ).filter((h) => h.offsetParent !== null);
        if (!headers.length) return;

        const limit = this.toolbarHeight() + 2;
        let pinned = headers[0];
        headers.forEach((h) => {
            if (h.getBoundingClientRect().top <= limit) pinned = h;
        });

        const file = pinned.closest('[data-file]');
        if (file) this.currentFile = file.dataset.file;
    },

    /**
     * The height file headers pin below, read from the CSS contract so the
     * value is not duplicated here.
     * @returns {number} Toolbar height in pixels
     */
    toolbarHeight() {
        const bar = document.querySelector('.app-toolbar');
        return bar ? Math.round(bar.getBoundingClientRect().height) : 0;
    }
};
