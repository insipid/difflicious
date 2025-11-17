/**
 * File navigation functionality
 * Provides functions for navigating between files in the diff view
 */

import { $$ } from './dom-utils.js';

/**
 * Navigate to the previous file in the diff
 * @param {string} currentFilePath - Path of the current file
 */
export function navigateToPreviousFile(currentFilePath) {
    const allFiles = Array.from($$('[data-file]'));
    const currentIndex = allFiles.findIndex(el => el.dataset.file === currentFilePath);

    if (currentIndex > 0) {
        const prevFile = allFiles[currentIndex - 1];
        prevFile.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        nextFile.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
