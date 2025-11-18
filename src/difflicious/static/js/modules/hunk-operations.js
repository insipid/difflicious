/**
 * Hunk operations for context expansion
 * Handles hunk adjacency checking, button management, and hunk merging
 */

// Debug toggle - can be overridden by main.js
let DEBUG = false;

export function setDebug(value) {
    DEBUG = value;
}

/**
 * Get hunk context from a button element
 * @param {HTMLElement} button - Expansion button
 * @returns {Object|null} Hunk context with element references
 */
export function hunkContext(button) {
    const currentHunk = button.closest('.hunk');
    if (!currentHunk) {
        return null;
    }

    const fileElement = currentHunk.closest('[data-file]');
    if (!fileElement) {
        return { currentHunk, fileElement: null, allHunks: [], currentIndex: -1, prevHunk: null, nextHunk: null };
    }

    const allHunks = Array.from(fileElement.querySelectorAll('.hunk'));
    const currentIndex = allHunks.indexOf(currentHunk);

    return {
        currentHunk,
        fileElement,
        allHunks,
        currentIndex,
        prevHunk: currentIndex > 0 ? allHunks[currentIndex - 1] : null,
        nextHunk: currentIndex < allHunks.length - 1 ? allHunks[currentIndex + 1] : null
    };
}

/**
 * Check if expansion makes hunks adjacent and hide buttons accordingly
 * @param {HTMLElement} button - Expansion button
 * @param {string} direction - Expansion direction ('before' or 'after')
 * @param {number} targetStart - Start line number
 * @param {number} targetEnd - End line number
 * @returns {boolean} True if hunks are now adjacent
 */
export function checkHunkAdjacency(button, direction, targetStart, targetEnd) {
    if (direction === 'after') {
        const context = hunkContext(button);
        if (!context?.fileElement) return false;

        const { currentHunk, nextHunk } = context;
        if (nextHunk) {
            const nextHunkStart = parseInt(nextHunk.dataset.lineStart);
            if (targetEnd === nextHunkStart - 1) {
                // Hide both before buttons in the next hunk (left and right sides)
                const nextHunkBeforeBtns = nextHunk.querySelectorAll('.expansion-btn[data-direction="before"]');
                nextHunkBeforeBtns.forEach(btn => {
                    btn.style.display = 'none';
                });
                if (nextHunkBeforeBtns.length > 0) {
                    hideExpansionBarIfAllButtonsHidden(nextHunkBeforeBtns[0]);
                }

                // Also hide all remaining after buttons in the current hunk since no more expansion is possible
                const currentHunkAfterBtns = currentHunk.querySelectorAll('.expansion-btn[data-direction="after"]');
                currentHunkAfterBtns.forEach(btn => {
                    btn.style.display = 'none';
                });
                if (currentHunkAfterBtns.length > 0) {
                    hideExpansionBarIfAllButtonsHidden(currentHunkAfterBtns[0]);
                }

                return true;
            }
        }
    } else if (direction === 'before') {
        const context = hunkContext(button);
        if (!context?.fileElement) return false;

        const { currentHunk, prevHunk } = context;
        if (prevHunk) {
            const prevHunkEnd = parseInt(prevHunk.dataset.lineEnd);
            if (targetStart <= prevHunkEnd + 1) {
                // Hide both after buttons in the previous hunk (left and right sides)
                const prevHunkAfterBtns = prevHunk.querySelectorAll('.expansion-btn[data-direction="after"]');
                prevHunkAfterBtns.forEach(btn => {
                    btn.style.display = 'none';
                });
                if (prevHunkAfterBtns.length > 0) {
                    hideExpansionBarIfAllButtonsHidden(prevHunkAfterBtns[0]);
                }

                // Also hide all remaining before buttons in the current hunk since no more expansion is possible
                const currentHunkBeforeBtns = currentHunk.querySelectorAll('.expansion-btn[data-direction="before"]');
                currentHunkBeforeBtns.forEach(btn => {
                    btn.style.display = 'none';
                });
                if (currentHunkBeforeBtns.length > 0) {
                    hideExpansionBarIfAllButtonsHidden(currentHunkBeforeBtns[0]);
                }

                return true;
            }
        }
    }
    return false;
}

/**
 * Handle button hiding logic
 * @param {HTMLElement} button - Expansion button
 * @param {string} direction - Expansion direction
 * @param {number} targetStart - Start line number
 * @param {number} targetEnd - End line number
 */
export function handleButtonHiding(button, direction, targetStart, targetEnd) {
    // End of file reached or touching next hunk - hide both buttons (left and right sides)
    const context = hunkContext(button);
    if (!context) return;

    const { currentHunk } = context;
    const sameSideButtons = currentHunk.querySelectorAll(`.expansion-btn[data-direction="${direction}"][data-target-start="${targetStart}"][data-target-end="${targetEnd}"]`);
    sameSideButtons.forEach(btn => {
        btn.style.display = 'none';
    });
    if (DEBUG) console.log(`Hiding button. Target range: ${targetStart}-${targetEnd}`);

    // If this was an up button that reached line 1, hide all buttons (file fully expanded)
    if (direction === 'before' && targetStart === 1) {
        if (DEBUG) console.log('Up button reached line 1 - hiding all expansion buttons');
        hideAllExpansionButtonsInHunk(button);
    }

    // Check if all expansion buttons in this hunk are now hidden
    hideExpansionBarIfAllButtonsHidden(button);
}

/**
 * Update button for next expansion
 * @param {HTMLElement} button - Expansion button
 * @param {string} direction - Expansion direction
 * @param {number} targetStart - Current start line
 * @param {number} targetEnd - Current end line
 * @param {number} contextLines - Number of context lines
 * @param {string} originalText - Original button text
 */
export function updateButtonForNextExpansion(button, direction, targetStart, targetEnd, contextLines, originalText) {
    // More lines available - update button for next expansion
    button.textContent = originalText;
    button.title = `Expand ${contextLines} more lines ${direction}`;

    // Update button's target range for next click
    if (direction === 'before') {
        const newTargetEnd = targetStart - 1;
        const newTargetStart = Math.max(1, newTargetEnd - contextLines + 1);

        // Check if we've reached the beginning of the file
        if (targetStart === 1) {
            // Beginning of file reached - hide both buttons (left and right sides)
            const context = hunkContext(button);
            if (!context) return;

            const { currentHunk } = context;
            const sameSideButtons = currentHunk.querySelectorAll(`.expansion-btn[data-direction="${direction}"][data-target-start="${targetStart}"][data-target-end="${targetEnd}"]`);
            sameSideButtons.forEach(btn => {
                btn.style.display = 'none';
            });
            if (DEBUG) console.log(`Beginning of file reached. Current targetStart was ${targetStart}. Hiding up buttons.`);
            hideExpansionBarIfAllButtonsHidden(button);
        } else {
            // Check for overlap with previous hunk before setting new range
            const context = hunkContext(button);
            if (!context) return;

            const { currentHunk, fileElement, prevHunk } = context;
            let adjustedTargetStart = newTargetStart;

            if (fileElement && prevHunk) {
                const prevHunkEnd = parseInt(prevHunk.dataset.lineEnd);

                // Ensure we don't expand into the previous hunk's visible range
                adjustedTargetStart = Math.max(adjustedTargetStart, prevHunkEnd + 1);

                // If adjustment makes the range invalid (start > end), hide both buttons (left and right sides)
                if (adjustedTargetStart > newTargetEnd) {
                    const sameSideButtons = currentHunk.querySelectorAll(`.expansion-btn[data-direction="${direction}"][data-target-start="${targetStart}"][data-target-end="${targetEnd}"]`);
                    sameSideButtons.forEach(btn => {
                        btn.style.display = 'none';
                    });
                    if (DEBUG) console.log('No room for expansion between hunks. Hiding up buttons.');
                    hideExpansionBarIfAllButtonsHidden(button);
                    return;
                }
            }

            button.dataset.targetStart = adjustedTargetStart;
            button.dataset.targetEnd = newTargetEnd;
        }
    } else {
        const newTargetStart = targetEnd + 1;
        const newTargetEnd = newTargetStart + contextLines - 1;

        // Check for overlap with next hunk before setting new range
        const context = hunkContext(button);
        if (!context) return;

        const { currentHunk, fileElement, nextHunk } = context;
        let adjustedTargetEnd = newTargetEnd;

        if (fileElement && nextHunk) {
            const nextHunkStart = parseInt(nextHunk.dataset.lineStart);

            // Ensure we don't expand into the next hunk's visible range
            adjustedTargetEnd = Math.min(adjustedTargetEnd, nextHunkStart - 1);

            // If adjustment makes the range invalid (start > end), hide both buttons (left and right sides)
            if (newTargetStart > adjustedTargetEnd) {
                const sameSideButtons = currentHunk.querySelectorAll(`.expansion-btn[data-direction="${direction}"][data-target-start="${targetStart}"][data-target-end="${targetEnd}"]`);
                sameSideButtons.forEach(btn => {
                    btn.style.display = 'none';
                });
                if (DEBUG) console.log('No room for expansion between hunks. Hiding down buttons.');
                hideExpansionBarIfAllButtonsHidden(button);
                return;
            }
        }

        button.dataset.targetStart = newTargetStart;
        button.dataset.targetEnd = adjustedTargetEnd;
    }
}

/**
 * Hide all expansion buttons in a hunk
 * @param {HTMLElement} triggerButton - Button that triggered the action
 */
export function hideAllExpansionButtonsInHunk(triggerButton) {
    // Get the hunk element containing the trigger button
    const hunkElement = triggerButton.closest('.hunk');
    if (!hunkElement) return;

    // Find the expansion bar within this hunk
    const expansionBar = hunkElement.querySelector('.hunk-expansion');
    if (!expansionBar) return;

    // Hide all expansion buttons in this hunk
    const expansionButtons = expansionBar.querySelectorAll('.expansion-btn');
    expansionButtons.forEach(btn => {
        btn.style.display = 'none';
        if (DEBUG) console.log(`Hiding ${btn.dataset.direction} button`);
    });
}

/**
 * Hide expansion bar if all buttons are hidden
 * @param {HTMLElement} triggerButton - Button to check
 */
export function hideExpansionBarIfAllButtonsHidden(triggerButton) {
    // Find the specific expansion bar that contains the trigger button
    const expansionBar = triggerButton.closest('.hunk-expansion');
    if (!expansionBar) return;

    // Check if all expansion buttons in this specific expansion bar are hidden
    const expansionButtons = expansionBar.querySelectorAll('.expansion-btn');
    const buttonStates = Array.from(expansionButtons).map(btn => ({
        direction: btn.dataset.direction,
        display: btn.style.display,
        hidden: btn.style.display === 'none'
    }));

    if (DEBUG) console.log('Button states in expansion bar:', buttonStates);

    const allHidden = buttonStates.every(state => state.hidden);

    if (allHidden) {
        expansionBar.style.display = 'none';
        if (DEBUG) console.log('All expansion buttons hidden - hiding expansion bar');
    } else {
        if (DEBUG) console.log('Not all buttons hidden - keeping expansion bar visible');
    }
}

/**
 * Check for hunk overlap and merge if necessary
 * @param {HTMLElement} triggerButton - Button that triggered expansion
 */
export function checkAndMergeHunks(triggerButton) {
    // Get the current hunk element
    const context = hunkContext(triggerButton);
    if (!context?.fileElement) return;

    const { currentHunk, prevHunk, nextHunk } = context;
    const currentStart = parseInt(currentHunk.dataset.lineStart);
    const currentEnd = parseInt(currentHunk.dataset.lineEnd);

    // Check previous hunk for overlap
    if (prevHunk) {
        const prevEnd = parseInt(prevHunk.dataset.lineEnd);

        // If current hunk now overlaps or touches previous hunk
        if (currentStart <= prevEnd + 1) {
            if (DEBUG) console.log(`Hunk merge detected: previous hunk ends at ${prevEnd}, current starts at ${currentStart}`);
            mergeHunks(prevHunk, currentHunk);
            return; // Exit after merge to avoid further processing
        }
    }

    // Check next hunk for overlap
    if (nextHunk) {
        const nextStart = parseInt(nextHunk.dataset.lineStart);

        // If current hunk now overlaps or touches next hunk
        if (currentEnd >= nextStart - 1) {
            if (DEBUG) console.log(`Hunk merge detected: current hunk ends at ${currentEnd}, next starts at ${nextStart}`);
            mergeHunks(currentHunk, nextHunk);
        }
    }
}

/**
 * Merge two adjacent hunks
 * @param {HTMLElement} firstHunk - First hunk element
 * @param {HTMLElement} secondHunk - Second hunk element
 */
export function mergeHunks(firstHunk, secondHunk) {
    // Simple merge: hide the expansion bar of the second hunk
    // In a full implementation, we'd merge the actual content
    const secondExpansionBar = secondHunk.querySelector('.hunk-expansion');
    if (secondExpansionBar) {
        secondExpansionBar.style.display = 'none';
        if (DEBUG) console.log('Merged hunks - hiding second expansion bar');
    }

    // Update the line range of the first hunk to encompass both
    const firstStart = parseInt(firstHunk.dataset.lineStart);
    const firstEnd = parseInt(firstHunk.dataset.lineEnd);
    const secondStart = parseInt(secondHunk.dataset.lineStart);
    const secondEnd = parseInt(secondHunk.dataset.lineEnd);

    const mergedStart = Math.min(firstStart, secondStart);
    const mergedEnd = Math.max(firstEnd, secondEnd);

    firstHunk.dataset.lineStart = mergedStart;
    firstHunk.dataset.lineEnd = mergedEnd;

    if (DEBUG) console.log(`Merged hunk range: ${mergedStart}-${mergedEnd}`);
}

/**
 * Handle all post-expansion logic
 * @param {HTMLElement} button - Expansion button
 * @param {Object} result - API response result
 * @param {number} contextLines - Number of context lines
 * @param {number} targetStart - Start line number
 * @param {number} targetEnd - End line number
 * @param {string} direction - Expansion direction
 * @param {string} originalText - Original button text
 */
export function handlePostExpansionLogic(button, result, contextLines, targetStart, targetEnd, direction, originalText) {
    const linesReceived = result.lines.length;
    let shouldHideButton = linesReceived < contextLines;

    // Check if expansion would make this hunk adjacent to adjacent hunks
    shouldHideButton = checkHunkAdjacency(button, direction, targetStart, targetEnd) || shouldHideButton;

    if (shouldHideButton) {
        handleButtonHiding(button, direction, targetStart, targetEnd);
    } else {
        updateButtonForNextExpansion(button, direction, targetStart, targetEnd, contextLines, originalText);
    }

    // Check for potential hunk merging
    checkAndMergeHunks(button);
}
