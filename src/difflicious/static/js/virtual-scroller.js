/**
 * Virtual Scrolling Engine for Difflicious
 * Manages viewport-based rendering of diff lines
 */

class VirtualDiffScroller {
    constructor(options = {}) {
        // Configuration
        this.containerSelector = options.container || '#diff-container';
        this.lineHeight = options.lineHeight || 22;
        this.visibleCount = options.visibleCount || 50;
        this.bufferCount = options.bufferCount || 15;
        this.scrollThrottle = options.scrollThrottle || 16; // ~60fps

        // State
        this.allLines = []; // Flattened array of all diff lines
        this.visibleRange = { start: 0, end: 0 };
        this.renderedRange = { start: -1, end: -1 };
        this.domPool = []; // Reusable DOM elements
        this.lineToElement = new Map(); // Track which elements show which lines

        // DOM references
        this.container = null;
        this.viewport = null;
        this.spacer = null;

        // Performance tracking
        this.lastScrollTime = 0;
        this.isScrolling = false;

        this.init();
    }

    init() {
        this.setupContainer();
        this.bindEvents();
        console.log('Virtual Diff Scroller initialized');
    }

    setupContainer() {
        this.container = document.querySelector(this.containerSelector);
        if (!this.container) {
            console.error('Virtual scroll container not found:', this.containerSelector);
            return;
        }

        // Create virtual viewport
        this.viewport = document.createElement('div');
        this.viewport.className = 'virtual-viewport';
        this.viewport.style.cssText = `
            position: relative;
            overflow: auto;
            height: 100%;
            contain: layout style paint;
        `;

        // Create spacer to maintain scroll height
        this.spacer = document.createElement('div');
        this.spacer.className = 'virtual-spacer';
        this.spacer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            pointer-events: none;
        `;

        // Setup DOM structure
        this.container.innerHTML = '';
        this.viewport.appendChild(this.spacer);
        this.container.appendChild(this.viewport);
    }

    bindEvents() {
        if (!this.viewport) return;

        // Throttled scroll handler for performance
        let scrollTimeout;
        this.viewport.addEventListener('scroll', (e) => {
            if (scrollTimeout) clearTimeout(scrollTimeout);

            this.isScrolling = true;
            this.handleScroll(e);

            scrollTimeout = setTimeout(() => {
                this.isScrolling = false;
                this.optimizeRendering(); // Clean up after scrolling stops
            }, 150);
        });

        // Resize handling
        window.addEventListener('resize', () => {
            this.recalculateViewport();
            this.renderVisibleRange();
        });
    }

    loadDiffData(diffData) {
        console.time('VirtualScroller: Data Processing');

        // Flatten nested diff structure into linear array
        this.allLines = this.flattenDiffData(diffData);

        // Update spacer height to match content
        const totalHeight = this.allLines.length * this.lineHeight;
        this.spacer.style.height = `${totalHeight}px`;

        console.timeEnd('VirtualScroller: Data Processing');
        console.log(`Virtual scroller loaded ${this.allLines.length} lines`);

        // Initial render
        this.recalculateViewport();
        this.renderVisibleRange();
    }

    flattenDiffData(diffData) {
        const lines = [];
        let globalLineIndex = 0;

        // Process each group (untracked, unstaged, staged)
        Object.entries(diffData.groups || {}).forEach(([groupKey, group]) => {
            if (!group.files || group.files.length === 0) return;

            group.files.forEach((file, fileIndex) => {
                // Add file header as a special line
                lines.push({
                    type: 'file-header',
                    globalIndex: globalLineIndex++,
                    groupKey,
                    fileIndex,
                    filePath: file.path,
                    fileData: file,
                    isExpanded: file.expanded || false
                });

                // Only include hunk lines if file is expanded
                if (file.expanded && file.hunks) {
                    file.hunks.forEach((hunk, hunkIndex) => {
                        // Add hunk header if present
                        if (hunk.section_header) {
                            lines.push({
                                type: 'hunk-header',
                                globalIndex: globalLineIndex++,
                                groupKey,
                                fileIndex,
                                hunkIndex,
                                filePath: file.path,
                                sectionHeader: hunk.section_header,
                                hunkData: hunk
                            });
                        }

                        // Add each diff line
                        hunk.lines.forEach((line, lineIndex) => {
                            lines.push({
                                type: 'diff-line',
                                globalIndex: globalLineIndex++,
                                groupKey,
                                fileIndex,
                                hunkIndex,
                                lineIndex,
                                filePath: file.path,
                                lineData: line,
                                needsHighlighting: true
                            });
                        });
                    });
                }
            });
        });

        return lines;
    }

    handleScroll(event) {
        const scrollTop = event.target.scrollTop;
        this.lastScrollTime = performance.now();

        // Calculate new visible range
        const newStart = Math.floor(scrollTop / this.lineHeight);
        const newEnd = Math.min(
            this.allLines.length,
            newStart + this.visibleCount + (this.bufferCount * 2)
        );

        // Only update if range changed significantly
        if (Math.abs(newStart - this.visibleRange.start) > 5 ||
            Math.abs(newEnd - this.visibleRange.end) > 5) {
            this.visibleRange = { start: newStart, end: newEnd };
            this.renderVisibleRange();
        }
    }

    // Method to simulate scroll events for testing
    simulateScroll(scrollTop) {
        this.isScrolling = true;
        this.handleScroll({ target: { scrollTop } });

        // Simulate timeout behavior for testing
        setTimeout(() => {
            this.isScrolling = false;
            this.optimizeRendering();
        }, 150);
    }

    recalculateViewport() {
        if (!this.container) return;

        const containerRect = this.container.getBoundingClientRect();
        const viewportHeight = containerRect.height;

        this.visibleCount = Math.ceil(viewportHeight / this.lineHeight) + this.bufferCount;

        // Recalculate current visible range
        const scrollTop = this.viewport ? this.viewport.scrollTop : 0;
        const start = Math.floor(scrollTop / this.lineHeight);
        const end = Math.min(this.allLines.length, start + this.visibleCount);

        this.visibleRange = { start, end };
    }

    renderVisibleRange() {
        if (!this.allLines.length) return;

        console.time('VirtualScroller: Render');

        const { start, end } = this.visibleRange;

        // Remove elements outside visible range
        this.cleanupInvisibleElements(start, end);

        // Render new visible elements (Phase 1: just log what would be rendered)
        for (let i = start; i < end; i++) {
            if (i >= this.allLines.length) break;

            const lineData = this.allLines[i];
            if (!this.lineToElement.has(i)) {
                // Phase 1: Just track what would be rendered
                console.log(`Would render line ${i}: ${lineData.type} - ${lineData.filePath || 'unknown'}`);

                // Create placeholder for now
                const placeholder = { type: lineData.type, globalIndex: i };
                this.lineToElement.set(i, placeholder);
            }
        }

        this.renderedRange = { start, end };
        console.timeEnd('VirtualScroller: Render');
        console.log(`Rendered range: ${start} - ${end}, Total lines: ${this.allLines.length}`);
    }

    cleanupInvisibleElements(visibleStart, visibleEnd) {
        const elementsToRemove = [];

        this.lineToElement.forEach((element, globalIndex) => {
            if (globalIndex < visibleStart || globalIndex >= visibleEnd) {
                elementsToRemove.push(globalIndex);
            }
        });

        elementsToRemove.forEach(globalIndex => {
            console.log(`Cleaning up line ${globalIndex}`);
            this.lineToElement.delete(globalIndex);
        });
    }

    optimizeRendering() {
        // Phase 1: Basic optimization placeholder
        console.log('Optimizing rendering after scroll stop');
    }

    // Utility methods for testing and debugging
    getTotalLines() {
        return this.allLines.length;
    }

    getVisibleRange() {
        return { ...this.visibleRange };
    }

    getRenderedRange() {
        return { ...this.renderedRange };
    }

    getRenderedElementCount() {
        return this.lineToElement.size;
    }

    // Method to check if scroller is properly initialized
    isInitialized() {
        return !!(this.container && this.viewport && this.spacer);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VirtualDiffScroller;
} else {
    window.VirtualDiffScroller = VirtualDiffScroller;
}
