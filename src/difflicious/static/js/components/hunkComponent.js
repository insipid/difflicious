/**
 * Alpine.js Hunk Component
 * Provides reactive UI state for diff hunk expansion
 * Wraps existing context-expansion.js logic
 */

export function hunkComponent(filePath, hunkIndex) {
    return {
        filePath,
        hunkIndex,
        loading: {
            before: false,
            after: false
        },

        /**
         * Initialize the component
         */
        init() {
            // Component initialization if needed
        },

        /**
         * Check if expansion is currently loading
         * @param {string} direction - 'before' or 'after'
         * @returns {boolean}
         */
        isLoading(direction) {
            return this.loading[direction] || false;
        },

        /**
         * Expand context in the specified direction
         * Wraps the existing expandContext function from modules/context-expansion.js
         * @param {Event} event - Click event from button
         * @param {string} direction - 'before' or 'after'
         */
        async expand(event, direction) {
            const button = event.target.closest('button');
            if (!button || this.loading[direction]) return;

            // Set loading state
            this.loading[direction] = true;

            try {
                // Call the existing expandContext function from vanilla JS modules
                // This function is exposed on window by main.js
                if (window.expandContext) {
                    await window.expandContext(
                        button,
                        this.filePath,
                        this.hunkIndex,
                        direction,
                        10, // contextLines
                        'pygments' // format
                    );
                }
            } catch (error) {
                console.error('Failed to expand context:', error);
            } finally {
                // Clear loading state
                this.loading[direction] = false;
            }
        },

        /**
         * Get button text based on loading state
         * @param {string} direction - 'before' or 'after'
         * @returns {string}
         */
        getButtonText(direction) {
            if (this.loading[direction]) {
                return '...';
            }
            return direction === 'before' ? '↑ Expand 10 lines' : '↓ Expand 10 lines';
        }
    };
}
