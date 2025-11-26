/**
 * File navigation functionality
 * Provides functions for navigating between files in the diff view
 */

import { $$ } from './dom-utils.js';

/**
 * Get the sticky header offset from CSS variables
 * @returns {number} The sticky header offset in pixels
 */
function getStickyHeaderOffset() {
    const styles = getComputedStyle(document.documentElement);
    const offset = styles.getPropertyValue('--file-header-sticky-offset');
    // Parse the rem value and convert to pixels
    if (offset.includes('rem')) {
        const remValue = parseFloat(offset);
        const rootFontSize = parseFloat(styles.fontSize);
        return remValue * rootFontSize;
    }
    return parseFloat(offset) || 0;
}

/**
 * Scroll to a file element, accounting for sticky header offset
 * @param {HTMLElement} fileElement - The file element to scroll to
 */
function scrollToFile(fileElement) {
    const spacerHeight = getStickyHeaderOffset();
    const elementTop = fileElement.getBoundingClientRect().top;
    const currentScroll = window.pageYOffset || document.documentElement.scrollTop;

    // Calculate target scroll position: element position plus spacer height
    // This scrolls the spacer above the viewport, positioning the actual header
    // content at the top (top: 0), which is its sticky position
    const targetScroll = currentScroll + elementTop + spacerHeight;

    window.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
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
