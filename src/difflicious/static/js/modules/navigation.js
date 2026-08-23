/**
 * File navigation functionality
 * Provides functions for navigating between files in the diff view
 */

import { $$ } from './dom-utils.js';

/**
 * Whether the visitor has asked for reduced motion.
 * @returns {boolean} True if animated scrolling should be skipped
 */
export function prefersReducedMotion() {
    return (
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

/**
 * Scroll a file to the top of the viewport, just below the sticky toolbar.
 *
 * The offset lives in CSS as `scroll-margin-top` on the file element, derived
 * from --file-header-sticky-offset. Letting the browser apply it keeps the
 * toolbar's height in one place; the previous hand-rolled arithmetic had to be
 * corrected whenever that layout changed.
 *
 * @param {HTMLElement} fileElement - The file element to scroll to
 */
export function scrollToFile(fileElement) {
    fileElement.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start'
    });
}

/**
 * Navigate to the previous file in the diff
 * @param {string} currentFilePath - Path of the current file
 */
export function navigateToPreviousFile(currentFilePath) {
    const allFiles = Array.from($$('[data-file]'));
    const currentIndex = allFiles.findIndex(el => el.dataset.file === currentFilePath);

    if (currentIndex > 0) {
        const prevFile = allFiles[currentIndex - 1];
        scrollToFile(prevFile);
    }
}

/**
 * Navigate to the next file in the diff
 * @param {string} currentFilePath - Path of the current file
 */
export function navigateToNextFile(currentFilePath) {
    const allFiles = Array.from($$('[data-file]'));
    const currentIndex = allFiles.findIndex(el => el.dataset.file === currentFilePath);

    if (currentIndex >= 0 && currentIndex < allFiles.length - 1) {
        const nextFile = allFiles[currentIndex + 1];
        scrollToFile(nextFile);
    }
}
